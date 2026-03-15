import uuid
from datetime import datetime, timezone

from sqlmodel import SQLModel, Field


class MealPoll(SQLModel, table=True):
    __tablename__ = "meal_polls"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    household_id: uuid.UUID = Field(foreign_key="households.id", index=True)
    recipe_id: uuid.UUID = Field(foreign_key="recipes.id")
    proposed_by: uuid.UUID = Field(foreign_key="users.id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PollVote(SQLModel, table=True):
    __tablename__ = "poll_votes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    poll_id: uuid.UUID = Field(foreign_key="meal_polls.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    vote: str  # yes / no
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
