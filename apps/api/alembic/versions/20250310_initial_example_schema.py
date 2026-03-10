"""Initial example schema (no seed; use pnpm db:seed:postgres for data).

Revision ID: 20250310_001
Revises:
Create Date: 2025-03-10

"""

from collections.abc import Sequence

from alembic import op

revision: str = "20250310_001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS example (
            id    SERIAL PRIMARY KEY,
            name  TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS example")
