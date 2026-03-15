import uuid
from datetime import datetime, timezone

from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    username: str
    hashed_password: str
    avatar_url: str | None = None
    household_id: uuid.UUID | None = Field(default=None, foreign_key="households.id", index=True)
    health_streak_days: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
