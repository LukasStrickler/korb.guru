import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_user
from app.models.user import User
from app.models.household import Household
from app.schemas.household import HouseholdCreate, HouseholdJoin, HouseholdResponse, HouseholdMemberResponse

router = APIRouter()


@router.post("", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
def create_household(body: HouseholdCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if user.household_id:
        raise HTTPException(status_code=400, detail="Already in a household")
    code = secrets.token_urlsafe(6)
    household = Household(name=body.name, invite_code=code, created_by=user.id)
    session.add(household)
    session.commit()
    session.refresh(household)
    user.household_id = household.id
    session.add(user)
    session.commit()
    return household


@router.post("/join", response_model=HouseholdResponse)
def join_household(body: HouseholdJoin, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if user.household_id:
        raise HTTPException(status_code=400, detail="Already in a household")
    household = session.exec(select(Household).where(Household.invite_code == body.invite_code)).first()
    if not household:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    user.household_id = household.id
    session.add(user)
    session.commit()
    session.refresh(user)
    return household


@router.get("", response_model=HouseholdResponse)
def get_household(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not user.household_id:
        raise HTTPException(status_code=404, detail="Not in a household")
    return session.get(Household, user.household_id)


@router.get("/members", response_model=list[HouseholdMemberResponse])
def get_members(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not user.household_id:
        raise HTTPException(status_code=404, detail="Not in a household")
    members = session.exec(select(User).where(User.household_id == user.household_id)).all()
    return members
