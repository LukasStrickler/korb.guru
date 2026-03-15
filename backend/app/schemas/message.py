import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    username: str | None = None
    text: str
    message_type: str
    created_at: datetime
