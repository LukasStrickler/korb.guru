"""Add unique constraint on swipe_actions(user_id, recipe_id).

Revision ID: 20260315_005
Revises: 20260315_004
Create Date: 2026-03-15
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260315_005"
down_revision: str | None = "20260315_004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_swipe_actions_user_recipe",
        "swipe_actions",
        ["user_id", "recipe_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_swipe_actions_user_recipe",
        "swipe_actions",
        type_="unique",
    )
