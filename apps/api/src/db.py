"""
Minimal DB access for the API. Uses DATABASE_URL and psycopg2.
For migrations and schema, see alembic/; this module is for runtime queries only.
"""

import os
from collections.abc import Generator
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor


def _get_url() -> str:
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        return ""
    if url.startswith("postgres://"):
        url = "postgresql://" + url.split("://", 1)[1]
    # psycopg2 expects postgresql:// (strip SQLAlchemy driver suffix like +psycopg2)
    if "postgresql+" in url:
        after_slash = url.split("://", 1)[-1]
        url = "postgresql://" + after_slash.split("+", 1)[-1]
    return url


@contextmanager
def get_cursor() -> Generator[RealDictCursor, None, None]:
    """Yield a cursor that returns rows as dicts. Use for read-only queries."""
    url = _get_url()
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    conn = psycopg2.connect(url, cursor_factory=RealDictCursor)
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    finally:
        conn.close()
