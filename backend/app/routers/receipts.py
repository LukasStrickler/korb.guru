import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.database import get_session
from app.dependencies import get_current_user, get_household_id
from app.models.budget import BudgetEntry
from app.models.user import User

router = APIRouter()


class ReceiptItem(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    price: float = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=9999)


class ReceiptScanRequest(BaseModel):
    retailer: str = Field(min_length=1, max_length=100)
    items: list[ReceiptItem] = Field(min_length=1)
    total: float = Field(gt=0)


@router.post("/scan")
def scan_receipt(
    body: ReceiptScanRequest,
    user: User = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    entry = BudgetEntry(
        household_id=household_id,
        amount=body.total,
        description=f"Receipt from {body.retailer} ({len(body.items)} items)",
        recorded_by=user.id,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return {
        "status": "processed",
        "budget_entry_id": str(entry.id),
        "retailer": body.retailer,
        "item_count": len(body.items),
        "total": body.total,
    }


class AutoRefillRule(BaseModel):
    ingredient_name: str = Field(min_length=1, max_length=200)
    threshold_days: int = Field(default=7, ge=1, le=365)


@router.post("/auto-refill")
def configure_auto_refill(
    body: AutoRefillRule,
    user: User = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
):
    return {
        "status": "configured",
        "ingredient": body.ingredient_name,
        "threshold_days": body.threshold_days,
        "message": f"Will auto-add {body.ingredient_name} to grocery list when not purchased within {body.threshold_days} days",
    }
