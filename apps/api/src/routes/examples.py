"""
GET /examples — read from Postgres example table (Alembic schema, apps/postgres/seed).
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import get_cursor

router = APIRouter(tags=["examples"])


class ExampleItem(BaseModel):
    """One row from the example table."""

    id: int
    name: str
    created_at: datetime


@router.get("/examples", response_model=list[ExampleItem])
def list_examples():
    """
    Return all rows from the example table (Postgres).
    Schema: apps/api/alembic. Seed: pnpm db:seed:postgres.
    Uses sync def so FastAPI runs the blocking DB call in a thread pool.
    """
    try:
        with get_cursor() as cur:
            cur.execute(
                "SELECT id, name, created_at FROM example ORDER BY id",
            )
            rows = cur.fetchall()
            return [ExampleItem(**dict(r)) for r in rows]
    except Exception as e:
        msg = f"Database unavailable: {e!s}"
        raise HTTPException(status_code=503, detail=msg) from e
