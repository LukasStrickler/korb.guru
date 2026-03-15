"""Add unique constraint on poll_votes(poll_id, user_id).

Revision ID: 20260315_002
Revises: 20260315_001
Create Date: 2026-03-15
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260315_002"
down_revision: str | None = "20260315_001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_poll_votes_poll_user",
        "poll_votes",
        ["poll_id", "user_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_poll_votes_poll_user",
        "poll_votes",
        type_="unique",
    )
