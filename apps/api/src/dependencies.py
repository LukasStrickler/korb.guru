"""Shared FastAPI dependencies — auth, pagination, household scoping."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import AuthUser, require_clerk_auth
from .db import get_db
from .models.user import User


@dataclass
class Pagination:
    offset: int
    limit: int


def get_pagination(
    offset: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max items to return"),
) -> Pagination:
    return Pagination(offset=offset, limit=limit)


async def get_current_user(
    auth: AuthUser = Depends(require_clerk_auth),
    session: AsyncSession = Depends(get_db),
) -> User:
    """Look up (or auto-create) the User row matching the Clerk JWT subject.

    Auto-create ensures first-time Clerk users get a DB row immediately.
    """
    result = await session.execute(select(User).where(User.clerk_id == auth.user_id))
    user = result.scalars().first()
    if user is None:
        # Auto-create user on first API call (Clerk handles the real signup).
        # Use try/except to handle race conditions where concurrent requests
        # both try to insert the same clerk_id.
        try:
            user = User(
                clerk_id=auth.user_id,
                email=f"{auth.user_id}@clerk.placeholder",
                username=auth.user_id[:20],
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        except IntegrityError:
            await session.rollback()
            result = await session.execute(
                select(User).where(User.clerk_id == auth.user_id)
            )
            user = result.scalars().first()
            if user is None:
                raise
    return user


async def get_household_id(
    user: User = Depends(get_current_user),
) -> uuid.UUID:
    if user.household_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not in a household",
        )
    return user.household_id
