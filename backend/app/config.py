import logging
import os
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings

_logger = logging.getLogger(__name__)

# Embedding dimension lookup
EMBEDDING_DIMENSIONS: dict[str, int] = {
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2": 384,
    "text-embedding-3-small": 384,  # request 384 dims from OpenAI
    "text-embedding-3-large": 384,
}
DEFAULT_EMBEDDING_DIM = 384


class Settings(BaseSettings):
    # PostgreSQL
    postgres_user: str = "korb"
    postgres_password: str = "korb_secret"
    postgres_db: str = "korb_guru"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    database_url: str = ""

    # Qdrant
    qdrant_mode: Literal["local", "docker", "cloud", "memory"] = "docker"
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None
    qdrant_host: str = "qdrant"
    qdrant_port: int = 6333

    # Embeddings
    embedding_provider: Literal["local", "openai"] = "local"
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    openai_api_key: str | None = None

    # JWT
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # Apify
    apify_token: str | None = None

    # App
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @model_validator(mode="after")
    def _build_database_url(self) -> "Settings":
        """Build database_url from postgres_* vars if not explicitly set."""
        if not self.database_url:
            self.database_url = (
                f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
                f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            )
        return self

    @property
    def vector_size(self) -> int:
        """Return the embedding dimension for the active provider/model."""
        return EMBEDDING_DIMENSIONS.get(self.embedding_model, DEFAULT_EMBEDDING_DIM)


settings = Settings()

if not settings.jwt_secret_key:
    if os.getenv("TESTING", "").lower() in ("1", "true"):
        settings.jwt_secret_key = "test-secret-key-not-for-production"
    else:
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. Set it in .env or as an environment variable. "
            "Refusing to start with an auto-generated key — tokens would be invalidated on restart."
        )
