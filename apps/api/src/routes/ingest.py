"""Ingest endpoint — accepts scraped product records, upserts to Postgres + Qdrant."""

from __future__ import annotations

import asyncio
import hashlib
import logging
import uuid
from datetime import date
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel, Field, field_validator
from qdrant_client import models
from sqlalchemy.dialects.postgresql import insert as pg_insert

from ..auth import require_ingest_auth
from ..db import get_session_local
from ..models.product import Product
from ..qdrant.client import get_qdrant_client
from ..services.embedding_service import embed_texts

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ingest"])

SPARSE_DIM = 2**20
QDRANT_COLLECTION = "products"


def _sparse_vector(text: str) -> tuple[list[int], list[float]]:
    """Build sparse BM25-style vector from tokenised text."""
    tokens = text.lower().split()
    seen: dict[int, int] = {}
    for token in tokens:
        h = int(hashlib.md5(token.encode()).hexdigest(), 16) % SPARSE_DIM
        seen[h] = seen.get(h, 0) + 1
    return list(seen.keys()), [float(v) for v in seen.values()]


def _deterministic_uuid(retailer: str, name: str) -> uuid.UUID:
    """Generate a deterministic UUID from retailer:name using MD5."""
    hex_digest = hashlib.md5(f"{retailer}:{name}".encode()).hexdigest()
    return uuid.UUID(hex_digest)


class ProductRecord(BaseModel):
    """Validated product record from a scraper."""

    retailer: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(None, max_length=2000)
    price: Decimal | None = None
    original_price: Decimal | None = Field(None, alias="originalPrice")
    discount_pct: float | None = Field(None, alias="discountPct")
    category: str | None = Field(None, max_length=200)
    image_url: str | None = Field(None, alias="imageUrl")
    valid_from: date | None = Field(None, alias="validFrom")
    valid_to: date | None = Field(None, alias="validTo")
    region: str = "zurich"

    model_config = {"populate_by_name": True}

    @field_validator("retailer", "name")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class IngestRequest(BaseModel):
    source: str = "scraper"
    sink: str = "stdout"
    record_count: int | None = Field(None, alias="recordCount")
    records: list[ProductRecord] = Field(default_factory=list)
    region: str = "zurich"


class IngestResponse(BaseModel):
    status: str
    accepted: int
    source: str


async def _process_records(
    records: list[ProductRecord], source: str, default_region: str
) -> None:
    """Background task: upsert products to Postgres and Qdrant."""
    if not records:
        return

    # --- Build Qdrant points first (embedding can fail before any DB writes) ---
    names = [rec.name for rec in records]
    embeddings = await asyncio.to_thread(embed_texts, names)

    points = []
    for rec, dense_vector in zip(records, embeddings):
        product_id = _deterministic_uuid(rec.retailer, rec.name)
        sparse_indices, sparse_values = _sparse_vector(rec.name)
        region = rec.region or default_region

        payload: dict[str, Any] = {
            "retailer": rec.retailer,
            "name": rec.name,
            "region": region,
        }
        if rec.category is not None:
            payload["category"] = rec.category
        if rec.price is not None:
            payload["price"] = float(rec.price)
        if rec.discount_pct is not None:
            payload["discount_pct"] = rec.discount_pct
        if rec.valid_to is not None:
            payload["valid_to"] = rec.valid_to.isoformat()

        points.append(
            models.PointStruct(
                id=product_id.hex,
                vector={
                    "dense": dense_vector,
                    "sparse": models.SparseVector(
                        indices=sparse_indices,
                        values=sparse_values,
                    ),
                },
                payload=payload,
            )
        )

    # --- Postgres upsert + Qdrant upsert in same transaction scope ---
    # Qdrant upsert runs inside the session.begin() block so that if it
    # fails, the Postgres transaction is rolled back automatically.
    session_factory = get_session_local()
    try:
        async with session_factory() as session:
            async with session.begin():
                for rec in records:
                    product_id = _deterministic_uuid(rec.retailer, rec.name)
                    stmt = pg_insert(Product).values(
                        id=product_id,
                        retailer=rec.retailer,
                        name=rec.name,
                        description=rec.description,
                        price=rec.price,
                        original_price=rec.original_price,
                        discount_pct=rec.discount_pct,
                        category=rec.category,
                        image_url=rec.image_url,
                        valid_from=rec.valid_from,
                        valid_to=rec.valid_to,
                        source=source,
                    )
                    stmt = stmt.on_conflict_do_update(
                        index_elements=["id"],
                        set_={
                            "description": stmt.excluded.description,
                            "price": stmt.excluded.price,
                            "original_price": stmt.excluded.original_price,
                            "discount_pct": stmt.excluded.discount_pct,
                            "category": stmt.excluded.category,
                            "image_url": stmt.excluded.image_url,
                            "valid_from": stmt.excluded.valid_from,
                            "valid_to": stmt.excluded.valid_to,
                            "source": stmt.excluded.source,
                        },
                    )
                    await session.execute(stmt)

                # Qdrant upsert BEFORE Postgres commit (begin block commits on exit)
                client = get_qdrant_client()
                await asyncio.to_thread(
                    client.upsert, collection_name=QDRANT_COLLECTION, points=points
                )
                logger.info("Qdrant upsert complete for %d points", len(points))

        logger.info("Postgres upsert complete for %d records", len(records))
    except Exception:
        logger.exception("Ingest failed (Postgres rolled back)")
        raise


@router.post("/ingest", response_model=IngestResponse, status_code=202)
async def ingest_records(
    payload: IngestRequest,
    background_tasks: BackgroundTasks,
    _auth: Annotated[None, Depends(require_ingest_auth)] = None,
) -> IngestResponse:
    if payload.records:
        background_tasks.add_task(
            _process_records,
            payload.records,
            payload.source,
            payload.region,
        )

    return IngestResponse(
        status="accepted",
        accepted=len(payload.records),
        source=payload.source,
    )
