"""Initialize Qdrant collections: products, recipes, user_preferences."""

import logging

from qdrant_client import models

from ..config import get_settings
from .client import get_qdrant_client

logger = logging.getLogger(__name__)


def init_collections() -> None:
    settings = get_settings()
    vector_size = settings.vector_size
    client = get_qdrant_client()
    existing = {c.name for c in client.get_collections().collections}

    # 1. Products — hybrid search with dense + sparse vectors
    if "products" not in existing:
        client.create_collection(
            collection_name="products",
            vectors_config={
                "dense": models.VectorParams(
                    size=vector_size, distance=models.Distance.COSINE
                ),
            },
            sparse_vectors_config={
                "sparse": models.SparseVectorParams(modifier=models.Modifier.IDF),
            },
            quantization_config=models.ScalarQuantization(
                scalar=models.ScalarQuantizationConfig(
                    type=models.ScalarType.INT8,
                    quantile=0.99,
                    always_ram=True,
                ),
            ),
        )
        for field, schema in [
            ("retailer", models.PayloadSchemaType.KEYWORD),
            ("category", models.PayloadSchemaType.KEYWORD),
            ("region", models.PayloadSchemaType.KEYWORD),
            ("price", models.PayloadSchemaType.FLOAT),
            ("discount_pct", models.PayloadSchemaType.FLOAT),
            ("valid_to", models.PayloadSchemaType.DATETIME),
        ]:
            client.create_payload_index("products", field, field_schema=schema)
        logger.info("Created 'products' collection with hybrid search")

    # 2. Recipes — dense vector search
    if "recipes" not in existing:
        client.create_collection(
            collection_name="recipes",
            vectors_config=models.VectorParams(
                size=vector_size, distance=models.Distance.COSINE
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

    # 3. User preferences — Discovery API
    if "user_preferences" not in existing:
        client.create_collection(
            collection_name="user_preferences",
            vectors_config=models.VectorParams(
                size=vector_size, distance=models.Distance.COSINE
            ),
        )
        for field in ["user_id", "household_id"]:
            client.create_payload_index(
                "user_preferences",
                field,
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
        logger.info("Created 'user_preferences' collection")

    logger.info("All Qdrant collections initialized")
