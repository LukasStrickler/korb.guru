"""Household schemas."""

import uuid

from pydantic import BaseModel, Field, field_validator


class HouseholdCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class HouseholdJoin(BaseModel):
    invite_code: str = Field(min_length=1, max_length=50)

    @field_validator("invite_code")
    @classmethod
    def strip_invite_code(cls, v: str) -> str:
        return v.strip()


class HouseholdResponse(BaseModel):
    id: uuid.UUID
    name: str
    invite_code: str

    model_config = {"from_attributes": True}


class HouseholdMemberResponse(BaseModel):
    id: uuid.UUID
    username: str
    avatar_url: str | None

    model_config = {"from_attributes": True}
