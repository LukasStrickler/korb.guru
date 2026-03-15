import uuid
from datetime import datetime, timezone

from sqlmodel import SQLModel, Field


class Household(SQLModel, table=True):
    __tablename__ = "households"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    invite_code: str = Field(unique=True, index=True)
    created_by: uuid.UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
