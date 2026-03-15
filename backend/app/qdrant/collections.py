import logging
from qdrant_client import models

from app.config import settings
from app.qdrant.client import get_qdrant_client

logger = logging.getLogger(__name__)

VECTOR_SIZE = settings.vector_size


def init_collections():
    client = get_qdrant_client()
    existing = {c.name for c in client.get_collections().collections}

    # 1. Products collection - hybrid search with named vectors
    if "products" not in existing:
        client.create_collection(
            collection_name="products",
            vectors_config={
                "dense": models.VectorParams(
                    size=VECTOR_SIZE,
                    distance=models.Distance.COSINE,
                ),
            },
            sparse_vectors_config={
                "sparse": models.SparseVectorParams(
                    modifier=models.Modifier.IDF,
                ),
            },
        )
        # Payload indexes for filtering
        for field, schema in [
            ("retailer", models.PayloadSchemaType.KEYWORD),
            ("category", models.PayloadSchemaType.KEYWORD),
            ("price", models.PayloadSchemaType.FLOAT),
            ("discount_pct", models.PayloadSchemaType.FLOAT),
            ("valid_to", models.PayloadSchemaType.DATETIME),
        ]:
            client.create_payload_index("products", field, field_schema=schema)
        logger.info("Created 'products' collection with hybrid search")

    # 2. Recipes collection
    if "recipes" not in existing:
        client.create_collection(
            collection_name="recipes",
            vectors_config=models.VectorParams(
                size=VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )
        for field, schema in [
            ("type", models.PayloadSchemaType.KEYWORD),
            ("cost", models.PayloadSchemaType.FLOAT),
            ("time_minutes", models.PayloadSchemaType.INTEGER),
            ("household_id", models.PayloadSchemaType.KEYWORD),
        ]:
            client.create_payload_index("recipes", field, field_schema=schema)
        logger.info("Created 'recipes' collection")

    # 3. User preferences collection - for Discovery API
    if "user_preferences" not in existing:
        client.create_collection(
            collection_name="user_preferences",
            vectors_config=models.VectorParams(
                size=VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )
        client.create_payload_index(
            "user_preferences", "user_id", field_schema=models.PayloadSchemaType.KEYWORD
        )
        logger.info("Created 'user_preferences' collection")

    logger.info("All Qdrant collections initialized")
