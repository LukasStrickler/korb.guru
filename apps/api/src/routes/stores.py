"""Store management — ingestion from Google Maps and listing."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import require_ingest_auth
from ..db import get_db
from ..dependencies import get_current_user
from ..models.store import Store
from ..models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/stores", tags=["stores"])

# Mapping from Google Maps category names to our brand slugs
BRAND_MAP: dict[str, str] = {
    "migros": "migros",
    "coop": "coop",
    "aldi": "aldi",
    "aldi suisse": "aldi",
    "lidl": "lidl",
    "denner": "denner",
}


def _detect_brand(title: str, category: str | None) -> str | None:
    """Detect retailer brand from Google Maps place title or category."""
    for text in (title, category):
        if not text:
            continue
        text_lower = text.lower()
        for keyword, brand in BRAND_MAP.items():
            if keyword in text_lower:
                return brand
    return None


class GoogleMapsPlace(BaseModel):
    """A place record from the Google Maps Apify actor."""

    title: str
    address: str | None = None
    latitude: float = Field(alias="lat")
    longitude: float = Field(alias="lng")
    place_id: str = Field(alias="placeId")
    phone: str | None = None
    website: str | None = None
    total_score: float | None = Field(None, alias="totalScore")
    category_name: str | None = Field(None, alias="categoryName")
    opening_hours: list[dict] | None = Field(None, alias="openingHours")

    model_config = {"populate_by_name": True}


class StoreIngestRequest(BaseModel):
    """Request body for bulk store ingestion from Google Maps."""

    places: list[GoogleMapsPlace]
    region: str = "zurich"


class StoreIngestResponse(BaseModel):
    status: str
    upserted: int
    skipped: int


@router.post("/ingest", response_model=StoreIngestResponse, status_code=200)
async def ingest_stores(
    payload: StoreIngestRequest,
    session: AsyncSession = Depends(get_db),
    _auth: Annotated[None, Depends(require_ingest_auth)] = None,
) -> StoreIngestResponse:
    """Upsert stores from Google Maps actor data.

    Uses google_place_id for deduplication. Only accepts places
    matching known retailer brands.
    """
    upserted = 0
    skipped = 0

    for place in payload.places:
        brand = _detect_brand(place.title, place.category_name)
        if not brand:
            skipped += 1
            continue

        hours_json = (
            json.dumps(place.opening_hours, ensure_ascii=False)
            if place.opening_hours
            else None
        )

        stmt = pg_insert(Store).values(
            id=uuid.uuid4(),
            name=place.title,
            brand=brand,
            latitude=place.latitude,
            longitude=place.longitude,
            address=place.address,
            google_place_id=place.place_id,
            phone=place.phone,
            website=place.website,
            rating=place.total_score,
            opening_hours=hours_json,
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_stores_google_place_id",
            set_={
                "name": stmt.excluded.name,
                "brand": stmt.excluded.brand,
                "address": stmt.excluded.address,
                "latitude": stmt.excluded.latitude,
                "longitude": stmt.excluded.longitude,
                "phone": stmt.excluded.phone,
                "website": stmt.excluded.website,
                "rating": stmt.excluded.rating,
                "opening_hours": stmt.excluded.opening_hours,
            },
        )
        await session.execute(stmt)
        upserted += 1

    await session.commit()
    logger.info("Store ingest: %d upserted, %d skipped", upserted, skipped)

    return StoreIngestResponse(
        status="ok",
        upserted=upserted,
        skipped=skipped,
    )


@router.get("")
async def list_stores(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    brand: str | None = Query(None, description="Filter by brand"),
):
    """List all stores, optionally filtered by brand."""
    query = select(Store)
    if brand:
        query = query.where(Store.brand == brand.lower())
    query = query.order_by(Store.brand, Store.name)
    result = await session.execute(query)
    return result.scalars().all()
