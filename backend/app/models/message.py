import uuid
from datetime import datetime, timezone

from sqlmodel import SQLModel, Field


class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    household_id: uuid.UUID = Field(foreign_key="households.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    text: str
    message_type: str = Field(default="text")  # text, system
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
