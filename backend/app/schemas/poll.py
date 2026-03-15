import uuid
from enum import Enum

from pydantic import BaseModel


class VoteChoice(str, Enum):
    yes = "yes"
    no = "no"


class PollCreate(BaseModel):
    recipe_id: uuid.UUID


class VoteRequest(BaseModel):
    vote: VoteChoice


class PollResponse(BaseModel):
    id: uuid.UUID
    recipe_id: uuid.UUID
    proposed_by: uuid.UUID
    is_active: bool
    yes_votes: list[uuid.UUID] = []
    no_votes: list[uuid.UUID] = []
