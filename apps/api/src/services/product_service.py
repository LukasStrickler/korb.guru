"""Product service — hybrid search, comparison, deals via Qdrant."""

import hashlib
import logging
import uuid

from qdrant_client import models

from ..qdrant.client import get_qdrant_client
from .embedding_service import embed_text

logger = logging.getLogger(__name__)


SPARSE_DIM = 2**20  # Must match crawler ingestion (SmartCart + Apify)


def _sparse_vector(text: str) -> tuple[list[int], list[float]]:
    """Build sparse BM25-style vector from tokenised text."""
    tokens = text.lower().split()
    seen: dict[int, int] = {}
    for token in tokens:
        h = int(hashlib.md5(token.encode()).hexdigest(), 16) % SPARSE_DIM
        seen[h] = seen.get(h, 0) + 1
    return list(seen.keys()), [float(v) for v in seen.values()]


def _fetch_preference_vector(
    client, user_id: str, household_id: str | None = None
) -> list[float] | None:
    """Fetch the user's preference vector from user_preferences collection."""
    try:
        must = [
            models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id))
        ]
        if household_id:
            must.append(
                models.FieldCondition(
                    key="household_id", match=models.MatchValue(value=household_id)
                )
            )
        results = client.scroll(
            collection_name="user_preferences",
            scroll_filter=models.Filter(must=must),
            with_vectors=True,
            limit=1,
        )[0]
        if results:
            vec = results[0].vector
            return list(vec.values())[0] if isinstance(vec, dict) else vec
    except Exception as e:
        logger.warning("Failed to fetch preference vector for user %s: %s", user_id, e)
    return None


def search_products_hybrid(
    query: str,
    retailers: list[str] | None = None,
    max_price: float | None = None,
    category: str | None = None,
    region: str | None = None,
    limit: int = 10,
    user_id: str | None = None,
    household_id: str | None = None,
) -> list:
    try:
        client = get_qdrant_client()
        dense_vector = embed_text(query)
        sparse_indices, sparse_values = _sparse_vector(query)

        must_conditions = []
        if retailers:
            must_conditions.append(
                models.FieldCondition(
                    key="retailer", match=models.MatchAny(any=retailers)
                )
            )
        if max_price is not None:
            must_conditions.append(
                models.FieldCondition(key="price", range=models.Range(lte=max_price))
            )
        if category:
            must_conditions.append(
                models.FieldCondition(
                    key="category", match=models.MatchValue(value=category)
                )
            )
        if region:
            must_conditions.append(
                models.FieldCondition(
                    key="region", match=models.MatchValue(value=region)
                )
            )

        query_filter = models.Filter(must=must_conditions) if must_conditions else None

        prefetch_limit = max(20, limit)
        results = client.query_points(
            collection_name="products",
            prefetch=[
                models.Prefetch(
                    query=models.SparseVector(
                        indices=sparse_indices, values=sparse_values
                    ),
                    using="sparse",
                    limit=prefetch_limit,
                ),
                models.Prefetch(
                    query=dense_vector, using="dense", limit=prefetch_limit
                ),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            query_filter=query_filter,
            search_params=models.SearchParams(
                quantization=models.QuantizationSearchParams(
                    rescore=True,
                    oversampling=2.0,
                ),
            ),
            limit=limit,
        )
        points = results.points

        # Re-rank using user preference vector when user context is provided
        if user_id and points:
            pref_vec = _fetch_preference_vector(client, user_id, household_id)
            if pref_vec:
                points = _rerank_with_preference(points, pref_vec)

        return points
    except Exception as e:
        logger.error("Product search failed: %s", e)
        return []


def _rerank_with_preference(
    points: list, pref_vector: list[float], pref_weight: float = 0.3
) -> list:
    """Re-rank results blending original score with preference."""
    import math

    def _cosine_sim(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0

    scored = []
    for p in points:
        vec = p.vector
        if isinstance(vec, dict):
            vec = vec.get("dense", [])
        if vec:
            pref_sim = _cosine_sim(vec, pref_vector)
        else:
            pref_sim = 0.0
        original = p.score if p.score is not None else 0.0
        blended = (1 - pref_weight) * original + pref_weight * pref_sim
        scored.append((blended, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    for blended_score, p in scored:
        p.score = blended_score
    return [p for _, p in scored]


def compare_products(ingredient: str, limit: int = 10) -> list:
    return search_products_hybrid(query=ingredient, limit=limit)


def get_deals(limit: int = 20) -> list:
    try:
        client = get_qdrant_client()
        return client.scroll(
            collection_name="products",
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(key="discount_pct", range=models.Range(gt=0))
                ]
            ),
            limit=limit,
            order_by=models.OrderBy(
                key="discount_pct", direction=models.Direction.DESC
            ),
        )[0]
    except Exception as e:
        logger.warning("Get deals failed: %s", e)
        return []


def update_product_preference(
    user_id: str, product_id: str, helpful: bool, household_id: str | None = None
) -> None:
    """Update user preference vector based on product feedback (sync)."""
    try:
        client = get_qdrant_client()

        # Fetch the product's dense vector from Qdrant
        points = client.retrieve(
            collection_name="products",
            ids=[product_id],
            with_vectors=["dense"],
        )
        if not points:
            logger.warning("Product %s not found for feedback", product_id)
            return

        product_vector = points[0].vector
        if isinstance(product_vector, dict):
            product_vector = product_vector["dense"]
    except Exception as e:
        logger.warning("Failed to fetch product %s for feedback: %s", product_id, e)
        return

    try:
        # Look up existing user preference vector
        existing = client.query_points(
            collection_name="user_preferences",
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="user_id", match=models.MatchValue(value=user_id)
                    )
                ]
            ),
            query=product_vector,
            with_vectors=True,
            limit=1,
        ).points

        if existing:
            point = existing[0]
            old_vector = point.vector
            if isinstance(old_vector, dict):
                old_vector = list(old_vector.values())[0]
            total = point.payload.get("total_accepts", 0) + point.payload.get(
                "total_rejects", 0
            )
            weight = 1.0 / (total + 1) if helpful else -0.5 / (total + 1)
            new_vector = [
                o + weight * (p - o) for o, p in zip(old_vector, product_vector)
            ]
            client.upsert(
                collection_name="user_preferences",
                points=[
                    models.PointStruct(
                        id=point.id,
                        vector=new_vector,
                        payload={
                            "user_id": user_id,
                            "household_id": household_id,
                            "total_accepts": point.payload.get("total_accepts", 0)
                            + (1 if helpful else 0),
                            "total_rejects": point.payload.get("total_rejects", 0)
                            + (0 if helpful else 1),
                        },
                    )
                ],
            )
        else:
            client.upsert(
                collection_name="user_preferences",
                points=[
                    models.PointStruct(
                        id=str(uuid.uuid4()),
                        vector=product_vector,
                        payload={
                            "user_id": user_id,
                            "household_id": household_id,
                            "total_accepts": 1 if helpful else 0,
                            "total_rejects": 0 if helpful else 1,
                        },
                    )
                ],
            )
    except Exception as e:
        logger.warning(
            "Failed to update product preference for user %s: %s", user_id, e
        )


def recommend_products(
    user_id: str,
    household_id: str | None = None,
    retailers: list[str] | None = None,
    limit: int = 10,
) -> list:
    """Recommend products using the user's preference vector via Qdrant recommend()."""
    try:
        client = get_qdrant_client()
        pref_vec = _fetch_preference_vector(client, user_id, household_id)
        if not pref_vec:
            logger.info("No preference vector for user %s, returning empty", user_id)
            return []

        must_conditions = []
        if retailers:
            must_conditions.append(
                models.FieldCondition(
                    key="retailer", match=models.MatchAny(any=retailers)
                )
            )
        query_filter = models.Filter(must=must_conditions) if must_conditions else None

        results = client.query_points(
            collection_name="products",
            query=pref_vec,
            using="dense",
            query_filter=query_filter,
            limit=limit,
        )
        return results.points
    except Exception as e:
        logger.warning("Product recommendations failed for user %s: %s", user_id, e)
        return []


def search_products_batch(
    queries: list[str],
    retailers: list[str] | None = None,
    max_price: float | None = None,
    limit: int = 10,
    user_id: str | None = None,
    household_id: str | None = None,
) -> dict[str, list]:
    """Run multiple product searches in a single Qdrant batch request."""
    try:
        client = get_qdrant_client()

        must_conditions = []
        if retailers:
            must_conditions.append(
                models.FieldCondition(
                    key="retailer", match=models.MatchAny(any=retailers)
                )
            )
        if max_price is not None:
            must_conditions.append(
                models.FieldCondition(key="price", range=models.Range(lte=max_price))
            )
        query_filter = models.Filter(must=must_conditions) if must_conditions else None

        prefetch_limit = max(20, limit)
        batch_requests = []
        for query in queries:
            dense_vector = embed_text(query)
            sparse_indices, sparse_values = _sparse_vector(query)
            batch_requests.append(
                models.QueryRequest(
                    prefetch=[
                        models.Prefetch(
                            query=models.SparseVector(
                                indices=sparse_indices, values=sparse_values
                            ),
                            using="sparse",
                            limit=prefetch_limit,
                        ),
                        models.Prefetch(
                            query=dense_vector, using="dense", limit=prefetch_limit
                        ),
                    ],
                    query=models.FusionQuery(fusion=models.Fusion.RRF),
                    filter=query_filter,
                    limit=limit,
                )
            )

        batch_results = client.query_batch_points(
            collection_name="products",
            requests=batch_requests,
        )

        result_map = {}
        pref_vec = None
        if user_id:
            pref_vec = _fetch_preference_vector(client, user_id, household_id)
        for query, result in zip(queries, batch_results):
            points = result.points
            if pref_vec and points:
                points = _rerank_with_preference(points, pref_vec)
            result_map[query] = points
        return result_map
    except Exception as e:
        logger.warning("Batch product search failed: %s", e)
        return {query: [] for query in queries}
