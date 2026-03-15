import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_user, get_pagination, Pagination
from app.models.user import User
from app.models.notification import Notification

router = APIRouter()


@router.get("")
def get_notifications(
    user: User = Depends(get_current_user),
    pagination: Pagination = Depends(get_pagination),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())  # type: ignore
        .offset(pagination.offset)
        .limit(pagination.limit)
    ).all()


@router.patch("/{notification_id}")
def mark_read(notification_id: uuid.UUID, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    n = session.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    session.add(n)
    session.commit()
    return {"status": "read"}


@router.delete("/{notification_id}")
def delete_notification(notification_id: uuid.UUID, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    n = session.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    session.delete(n)
    session.commit()
    return {"status": "deleted"}
