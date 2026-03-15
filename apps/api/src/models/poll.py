"""Poll models — meal voting within households."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class MealPoll(Base, TimestampMixin):
    __tablename__ = "meal_polls"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    household_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("households.id"), nullable=False, index=True
    )
    recipe_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recipes.id"), nullable=False
    )
    proposed_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class PollVote(Base, TimestampMixin):
    __tablename__ = "poll_votes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    poll_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("meal_polls.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    vote: Mapped[str] = mapped_column(String(10), nullable=False)  # yes/no
