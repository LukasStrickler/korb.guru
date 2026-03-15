"""Receipt scanning and auto-refill configuration."""

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..dependencies import get_current_user, get_household_id
from ..models.auto_refill import AutoRefillRule as AutoRefillRuleModel
from ..models.budget import BudgetEntry
from ..models.user import User

router = APIRouter(prefix="/api/v1/receipts", tags=["receipts"])


class ReceiptItem(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    price: float = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=9999)


class ReceiptScanRequest(BaseModel):
    retailer: str = Field(min_length=1, max_length=100)
    items: list[ReceiptItem] = Field(min_length=1)
    total: float = Field(gt=0)

    @field_validator("total")
    @classmethod
    def total_max_two_decimals(cls, v: float) -> float:
        if round(v, 2) != v:
            raise ValueError("total must have at most 2 decimal places")
        return round(v, 2)


class AutoRefillRuleRequest(BaseModel):
    ingredient_name: str = Field(min_length=1, max_length=200)
    threshold_days: int = Field(default=7, ge=1, le=365)


@router.post("/scan")
async def scan_receipt(
    body: ReceiptScanRequest,
    user: User = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
    session: AsyncSession = Depends(get_db),
):
    entry = BudgetEntry(
        household_id=household_id,
        amount=body.total,
        description=f"Receipt from {body.retailer} ({len(body.items)} items)",
        recorded_by=user.id,
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)
    return {
        "status": "processed",
        "budget_entry_id": str(entry.id),
        "retailer": body.retailer,
        "item_count": len(body.items),
        "total": body.total,
    }


@router.post("/auto-refill", status_code=201)
async def configure_auto_refill(
    body: AutoRefillRuleRequest,
    user: User = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
    session: AsyncSession = Depends(get_db),
):
    rule = AutoRefillRuleModel(
        household_id=household_id,
        created_by=user.id,
        ingredient_name=body.ingredient_name,
        threshold_days=body.threshold_days,
    )
    session.add(rule)
    await session.commit()
    await session.refresh(rule)
    return {
        "id": str(rule.id),
        "ingredient_name": rule.ingredient_name,
        "threshold_days": rule.threshold_days,
    }


@router.get("/auto-refill")
async def list_auto_refill_rules(
    household_id: uuid.UUID = Depends(get_household_id),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(AutoRefillRuleModel).where(
            AutoRefillRuleModel.household_id == household_id
        )
    )
    rules = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "ingredient_name": r.ingredient_name,
            "threshold_days": r.threshold_days,
        }
        for r in rules
    ]
