"""User notifications — list, mark read, delete."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..dependencies import Pagination, get_current_user, get_pagination
from ..models.notification import Notification
from ..models.user import User

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(
    user: User = Depends(get_current_user),
    pagination: Pagination = Depends(get_pagination),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.limit)
    )
    return result.scalars().all()


@router.patch("/{notification_id}")
async def mark_read(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    n = await session.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    session.add(n)
    await session.commit()
    return {"status": "read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    n = await session.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    await session.delete(n)
    await session.commit()
    return {"status": "deleted"}
