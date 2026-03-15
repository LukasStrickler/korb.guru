"""Ingest normalized products into Qdrant."""
import hashlib
import logging

from qdrant_client import QdrantClient, models

from crawler.apify.config import QDRANT_MODE, QDRANT_URL, QDRANT_API_KEY

logger = logging.getLogger(__name__)

SPARSE_DIM = 2**20


def _sparse_vector(text: str) -> models.SparseVector:
    """Deterministic sparse vector from token hashes (MD5-based)."""
    tokens = text.lower().split()
    seen: dict[int, int] = {}
    for t in tokens:
        h = int(hashlib.md5(t.encode()).hexdigest(), 16) % SPARSE_DIM
        seen[h] = seen.get(h, 0) + 1
    return models.SparseVector(
        indices=list(seen.keys()),
        values=[float(v) for v in seen.values()],
    )


def get_client() -> QdrantClient:
    if QDRANT_MODE == "cloud":
        return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    return QdrantClient(host="localhost", port=6333)


def ingest_items(items: list[dict]):
    if not items:
        return

    logger.info(f"Embedding {len(items)} products...")

    from fastembed import TextEmbedding
    model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

    texts = [f"{p['name']} {p.get('description', '')} {p.get('category', '')} {p['retailer']}" for p in items]
    vectors = [e.tolist() for e in model.embed(texts)]

    client = get_client()
    points = []

    for item, vector in zip(items, vectors):
        text = f"{item['name']} {item.get('description', '')} {item.get('category', '')}"

        # Deterministic ID from stable product identifiers — price changes update existing points.
        # Include category to avoid collisions when brand is absent (same name, different category).
        # Trade-off: reclassified products create new points instead of updating; acceptable since
        # categories rarely change and collision prevention is more important for data integrity.
        dedup_key = f"{item['retailer']}:{item['name']}:{item.get('brand', '')}:{item.get('category', '')}"
        point_id = hashlib.md5(dedup_key.encode()).hexdigest()

        points.append(models.PointStruct(
            id=point_id,
            vector={
                "dense": vector,
                "sparse": _sparse_vector(text),
            },
            payload={
                "retailer": item["retailer"],
                "name": item["name"],
                "price": item.get("price"),
                "category": item.get("category"),
                "discount_pct": item.get("discount_pct"),
                "image_url": item.get("image_url"),
                "source": "apify",
            },
        ))

    for i in range(0, len(points), 100):
        client.upsert(collection_name="products", points=points[i:i + 100])

    logger.info(f"Ingested {len(points)} products to Qdrant")
