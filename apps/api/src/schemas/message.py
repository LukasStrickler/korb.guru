"""Message schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000, strip_whitespace=True)

    @field_validator("text")
    @classmethod
    def reject_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message text must not be blank")
        return v


class MessageResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    username: str | None = None
    text: str
    message_type: str
    created_at: datetime
