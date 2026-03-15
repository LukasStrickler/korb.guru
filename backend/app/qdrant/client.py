import logging
from qdrant_client import QdrantClient

from app.config import settings

logger = logging.getLogger(__name__)

_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    global _client
    if _client is not None:
        return _client

    mode = settings.qdrant_mode
    logger.info(f"Initializing Qdrant client in '{mode}' mode")

    if mode == "cloud":
        if not settings.qdrant_url or not settings.qdrant_api_key:
            raise ValueError("QDRANT_URL and QDRANT_API_KEY required for cloud mode")
        _client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    elif mode == "docker":
        _client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    elif mode == "local":
        _client = QdrantClient(path="./qdrant_data")
    elif mode == "memory":
        _client = QdrantClient(":memory:")
    else:
        raise ValueError(f"Unknown QDRANT_MODE: {mode}")

    logger.info(f"Qdrant client connected ({mode})")
    return _client
