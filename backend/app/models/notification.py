import uuid
from datetime import datetime, timezone

from sqlmodel import SQLModel, Field


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    text: str
    icon: str = Field(default="bell")
    color: str = Field(default="bg-emerald-500")
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
