import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class BudgetSettingsUpdate(BaseModel):
    weekly_limit: Decimal | None = Field(default=None, ge=0, decimal_places=2)


class BudgetSettingsResponse(BaseModel):
    weekly_limit: Decimal
    total_savings: Decimal


class BudgetEntryCreate(BaseModel):
    amount: Decimal = Field(ge=0, decimal_places=2)
    description: str | None = Field(default=None, max_length=500)


class BudgetEntryResponse(BaseModel):
    id: uuid.UUID
    amount: Decimal
    description: str | None
    recorded_by: uuid.UUID
    recorded_at: datetime


class WeeklySummaryResponse(BaseModel):
    weekly_limit: Decimal
    spent_this_week: Decimal
    remaining: Decimal
    total_savings: Decimal
