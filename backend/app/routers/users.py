from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session

from app.database import get_session
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import UserResponse, validate_username

router = APIRouter()


class ProfileUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=2, max_length=50)
    avatar_url: str | None = None

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return validate_username(v)


@router.patch("/me", response_model=UserResponse)
def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if body.username is not None:
        user.username = body.username
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.get("/health-streak")
def get_health_streak(user: User = Depends(get_current_user)):
    return {"health_streak_days": user.health_streak_days}


@router.post("/health-streak/increment")
def increment_health_streak(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Atomic SQL increment to avoid race conditions
    session.execute(
        User.__table__.update()  # type: ignore
        .where(User.id == user.id)
        .values(health_streak_days=User.health_streak_days + 1)
    )
    session.commit()
    session.refresh(user)
    return {"health_streak_days": user.health_streak_days}


@router.post("/health-streak/reset")
def reset_health_streak(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Atomic SQL update to avoid race conditions
    session.execute(
        User.__table__.update()  # type: ignore
        .where(User.id == user.id)
        .values(health_streak_days=0)
    )
    session.commit()
    session.refresh(user)
    return {"health_streak_days": user.health_streak_days}
