import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select

from app.database import get_session
from app.models.user import User
from app.services.auth_service import decode_access_token

security = HTTPBearer()


@dataclass
class Pagination:
    offset: int
    limit: int


def get_pagination(
    offset: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max items to return"),
) -> Pagination:
    return Pagination(offset=offset, limit=limit)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = session.get(User, user_uuid)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def get_household_id(user: User = Depends(get_current_user)) -> uuid.UUID:
    if user.household_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not in a household")
    return user.household_id
