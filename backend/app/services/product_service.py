import hashlib
import logging
import uuid

from qdrant_client import models
from sqlmodel import Session

from app.models.product import Product
from app.qdrant.client import get_qdrant_client
from app.services.embedding_service import embed_text

logger = logging.getLogger(__name__)


def ingest_product(product: Product, session: Session):
    """Embed and upsert a single product to Qdrant + DB atomically."""
    session.add(product)
    session.flush()  # Assign ID without committing

    client = get_qdrant_client()
    text = f"{product.name} {product.description or ''} {product.category or ''} {product.retailer}"
    dense_vector = embed_text(text)

    # Build sparse vector from tokenized text (simple BM25-style)
    tokens = text.lower().split()
    sparse_indices = []
    sparse_values = []
    seen: dict[str, int] = {}
    for token in tokens:
        h = int(hashlib.md5(token.encode()).hexdigest(), 16) % 100000
        if h not in seen:
            seen[h] = 0
        seen[h] += 1
    for idx, count in seen.items():
        sparse_indices.append(idx)
        sparse_values.append(float(count))

    try:
        client.upsert(
            collection_name="products",
            points=[
                models.PointStruct(
                    id=str(product.id),
                    vector={
                        "dense": dense_vector,
                        "sparse": models.SparseVector(indices=sparse_indices, values=sparse_values),
                    },
                    payload={
                        "product_id": str(product.id),
                        "retailer": product.retailer,
                        "name": product.name,
                        "price": product.price,
                        "category": product.category,
                        "discount_pct": product.discount_pct,
                        "valid_from": product.valid_from.isoformat() if product.valid_from else None,
                        "valid_to": product.valid_to.isoformat() if product.valid_to else None,
                    },
                )
            ],
        )
    except Exception:
        session.rollback()
        raise

    session.commit()
    session.refresh(product)
    return product


def search_products_hybrid(
    query: str,
    retailers: list[str] | None = None,
    max_price: float | None = None,
    category: str | None = None,
    limit: int = 10,
):
    try:
        client = get_qdrant_client()
        dense_vector = embed_text(query)

        tokens = query.lower().split()
        sparse_indices = []
        sparse_values = []
        seen: dict[str, int] = {}
        for token in tokens:
            h = int(hashlib.md5(token.encode()).hexdigest(), 16) % 100000
            if h not in seen:
                seen[h] = 0
            seen[h] += 1
        for idx, count in seen.items():
            sparse_indices.append(idx)
            sparse_values.append(float(count))

        must_conditions = []
        if retailers:
            must_conditions.append(
                models.FieldCondition(key="retailer", match=models.MatchAny(any=retailers))
            )
        if max_price is not None:
            must_conditions.append(
                models.FieldCondition(key="price", range=models.Range(lte=max_price))
            )
        if category:
            must_conditions.append(
                models.FieldCondition(key="category", match=models.MatchValue(value=category))
            )

        query_filter = models.Filter(must=must_conditions) if must_conditions else None

        results = client.query_points(
            collection_name="products",
            prefetch=[
                models.Prefetch(
                    query=models.SparseVector(indices=sparse_indices, values=sparse_values),
                    using="sparse",
                    limit=20,
                ),
                models.Prefetch(query=dense_vector, using="dense", limit=20),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            query_filter=query_filter,
            limit=limit,
        )
        return results.points
    except Exception as e:
        logger.warning("Product search failed: %s", e)
        return []


def compare_products(ingredient: str, limit: int = 10):
    """Find best deals for an ingredient across all retailers."""
    return search_products_hybrid(query=ingredient, limit=limit)


def get_deals(limit: int = 20):
    """Get products with highest discounts."""
    try:
        client = get_qdrant_client()
        return client.scroll(
            collection_name="products",
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="discount_pct",
                        range=models.Range(gt=0),
                    )
                ]
            ),
            limit=limit,
            order_by=models.OrderBy(key="discount_pct", direction=models.Direction.DESC),
        )[0]
    except Exception as e:
        logger.warning("Get deals failed: %s", e)
        return []
