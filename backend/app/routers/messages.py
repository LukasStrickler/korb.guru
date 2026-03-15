import uuid

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_user, get_household_id, get_pagination, Pagination
from app.models.user import User
from app.models.message import Message
from app.schemas.message import MessageCreate, MessageResponse

router = APIRouter()


@router.get("", response_model=list[MessageResponse])
def get_messages(
    household_id: uuid.UUID = Depends(get_household_id),
    pagination: Pagination = Depends(get_pagination),
    session: Session = Depends(get_session),
):
    messages = session.exec(
        select(Message)
        .where(Message.household_id == household_id)
        .order_by(Message.created_at)
        .offset(pagination.offset)
        .limit(pagination.limit)
    ).all()
    if not messages:
        return []
    user_ids = list({msg.user_id for msg in messages})
    users = session.exec(select(User).where(User.id.in_(user_ids))).all()  # type: ignore
    user_map = {u.id: u.username for u in users}
    return [
        MessageResponse(
            id=msg.id, user_id=msg.user_id, username=user_map.get(msg.user_id),
            text=msg.text, message_type=msg.message_type, created_at=msg.created_at,
        )
        for msg in messages
    ]


@router.post("", response_model=MessageResponse)
def send_message(
    body: MessageCreate,
    user: User = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    msg = Message(household_id=household_id, user_id=user.id, text=body.text)
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return MessageResponse(
        id=msg.id, user_id=msg.user_id, username=user.username,
        text=msg.text, message_type=msg.message_type, created_at=msg.created_at,
    )
