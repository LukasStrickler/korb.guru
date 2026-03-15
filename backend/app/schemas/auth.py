import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator


def validate_username(v: str) -> str:
    """Shared username validation: strip, check length, check characters."""
    v = v.strip()
    if len(v) < 2:
        raise ValueError("Username must be at least 2 characters after trimming")
    if not all(c.isalnum() or c in "-_ " for c in v):
        raise ValueError("Username may only contain letters, digits, hyphens, underscores, and spaces")
    return v


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        return validate_username(v)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    avatar_url: str | None
    household_id: uuid.UUID | None
    health_streak_days: int
