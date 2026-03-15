import logging
from functools import lru_cache

from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_fastembed_model():
    from fastembed import TextEmbedding

    return TextEmbedding(model_name=settings.embedding_model)


def embed_texts(texts: list[str]) -> list[list[float]]:
    try:
        if settings.embedding_provider == "local":
            model = _get_fastembed_model()
            embeddings = list(model.embed(texts))
            return [e.tolist() for e in embeddings]
        elif settings.embedding_provider == "openai":
            import httpx

            resp = httpx.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": settings.embedding_model if settings.embedding_model.startswith("text-embedding") else "text-embedding-3-small",
                    "input": texts,
                    "dimensions": settings.vector_size,
                },
                timeout=30.0,
            )
            resp.raise_for_status()
            return [d["embedding"] for d in resp.json()["data"]]
        else:
            raise ValueError(f"Unknown embedding provider: {settings.embedding_provider}")
    except Exception as e:
        logger.warning("Embedding failed: %s", e)
        raise


def embed_text(text: str) -> list[float]:
    return embed_texts([text])[0]
