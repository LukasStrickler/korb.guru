import uuid
from datetime import datetime, timezone
from decimal import Decimal

import sqlalchemy as sa
from sqlmodel import SQLModel, Field


class BudgetEntry(SQLModel, table=True):
    __tablename__ = "budget_entries"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    household_id: uuid.UUID = Field(foreign_key="households.id", index=True)
    amount: Decimal = Field(sa_column=sa.Column(sa.Numeric(10, 2), nullable=False))
    description: str | None = None
    recorded_by: uuid.UUID = Field(foreign_key="users.id", index=True)
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BudgetSettings(SQLModel, table=True):
    __tablename__ = "budget_settings"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    household_id: uuid.UUID = Field(foreign_key="households.id", unique=True)
    weekly_limit: Decimal = Field(default=Decimal("80.00"), sa_column=sa.Column(sa.Numeric(10, 2), nullable=False, server_default="80.00"))
    total_savings: Decimal = Field(default=Decimal("0.00"), sa_column=sa.Column(sa.Numeric(10, 2), nullable=False, server_default="0.00"))
