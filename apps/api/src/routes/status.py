"""System status endpoint — checks health of all external dependencies."""

import asyncio
import logging
import os
import time

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db

router = APIRouter(tags=["status"])
logger = logging.getLogger(__name__)


@router.get("/status")
async def system_status(db: AsyncSession = Depends(get_db)):
    """Check health of all external services."""
    checks: dict[str, dict] = {}
    overall = "ok"

    # 1. PostgreSQL
    try:
        start = time.perf_counter()
        await db.execute(text("SELECT 1"))
        latency_ms = (time.perf_counter() - start) * 1000
        checks["postgres"] = {"status": "ok", "latency_ms": round(latency_ms, 1)}
    except Exception as e:
        logger.warning("Postgres health check failed: %s", e)
        checks["postgres"] = {"status": "error", "error": "unavailable"}
        overall = "degraded"

    # 2. Qdrant
    try:
        from ..qdrant.client import get_qdrant_client

        start = time.perf_counter()
        client = get_qdrant_client()
        collections = (await asyncio.to_thread(client.get_collections)).collections
        latency_ms = (time.perf_counter() - start) * 1000
        checks["qdrant"] = {
            "status": "ok",
            "latency_ms": round(latency_ms, 1),
            "collections": [c.name for c in collections],
        }
    except Exception as e:
        logger.warning("Qdrant health check failed: %s", e)
        checks["qdrant"] = {"status": "error", "error": "unavailable"}
        overall = "degraded"

    # 3. OpenRouter LLM
    api_key = os.getenv("OPENROUTER_API_KEY")
    checks["openrouter"] = {
        "status": "ok" if api_key else "not_configured",
        "configured": bool(api_key),
    }
    if not api_key:
        overall = "degraded"

    # 4. Apify
    apify_token = os.getenv("APIFY_TOKEN")
    checks["apify"] = {
        "status": "ok" if apify_token else "not_configured",
        "configured": bool(apify_token),
    }

    # 5. Embedding service
    try:
        from ..config import get_settings

        settings = get_settings()
        checks["embeddings"] = {
            "status": "ok",
            "provider": settings.embedding_provider,
            "model": settings.embedding_model,
            "dimensions": settings.vector_size,
        }
    except Exception as e:
        checks["embeddings"] = {"status": "error", "error": str(e)}
        overall = "degraded"

    return {"status": overall, "checks": checks}
