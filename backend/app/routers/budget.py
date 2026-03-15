import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.database import get_session
from app.dependencies import get_current_user, get_household_id, get_pagination, Pagination
from app.models.user import User
from app.models.budget import BudgetEntry, BudgetSettings
from app.schemas.budget import (
    BudgetSettingsUpdate,
    BudgetSettingsResponse,
    BudgetEntryCreate,
    BudgetEntryResponse,
    WeeklySummaryResponse,
)

router = APIRouter()


def _get_or_create_settings(household_id: uuid.UUID, session: Session) -> BudgetSettings:
    settings = session.exec(select(BudgetSettings).where(BudgetSettings.household_id == household_id)).first()
    if not settings:
        settings = BudgetSettings(household_id=household_id)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


@router.get("/settings", response_model=BudgetSettingsResponse)
def get_settings(household_id: uuid.UUID = Depends(get_household_id), session: Session = Depends(get_session)):
    s = _get_or_create_settings(household_id, session)
    return s


@router.patch("/settings", response_model=BudgetSettingsResponse)
def update_settings(
    body: BudgetSettingsUpdate,
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    s = _get_or_create_settings(household_id, session)
    if body.weekly_limit is not None:
        s.weekly_limit = body.weekly_limit
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


@router.post("/entries", response_model=BudgetEntryResponse, status_code=201)
def add_entry(
    body: BudgetEntryCreate,
    user: User = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    entry = BudgetEntry(household_id=household_id, amount=body.amount, description=body.description, recorded_by=user.id)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.get("/entries", response_model=list[BudgetEntryResponse])
def get_entries(
    household_id: uuid.UUID = Depends(get_household_id),
    pagination: Pagination = Depends(get_pagination),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(BudgetEntry)
        .where(BudgetEntry.household_id == household_id)
        .order_by(BudgetEntry.recorded_at.desc())  # type: ignore
        .offset(pagination.offset)
        .limit(pagination.limit)
    ).all()


@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
def weekly_summary(household_id: uuid.UUID = Depends(get_household_id), session: Session = Depends(get_session)):
    s = _get_or_create_settings(household_id, session)
    week_start = datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    spent = float(session.exec(
        select(func.coalesce(func.sum(BudgetEntry.amount), 0.0)).where(
            BudgetEntry.household_id == household_id,
            BudgetEntry.recorded_at >= week_start,
        )
    ).one())
    return WeeklySummaryResponse(
        weekly_limit=float(s.weekly_limit),
        spent_this_week=spent,
        remaining=float(s.weekly_limit) - spent,
        total_savings=float(s.total_savings),
    )
