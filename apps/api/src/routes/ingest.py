from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..auth import require_ingest_auth

router = APIRouter(tags=["ingest"])


class IngestRequest(BaseModel):
    source: str = "scraper"
    sink: str = "stdout"
    record_count: int | None = Field(None, alias="recordCount")
    records: list[dict[str, Any]] = Field(default_factory=list)


class IngestResponse(BaseModel):
    status: str
    accepted: int
    source: str


@router.post("/ingest", response_model=IngestResponse, status_code=202)
async def ingest_records(
    payload: IngestRequest,
    _auth: Annotated[None, Depends(require_ingest_auth)] = None,
) -> IngestResponse:
    return IngestResponse(
        status="accepted",
        accepted=len(payload.records),
        source=payload.source,
    )
