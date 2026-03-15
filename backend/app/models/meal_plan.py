import uuid
from datetime import date, datetime, timezone

import sqlalchemy as sa
from sqlmodel import SQLModel, Field

MEAL_SLOT_VALUES = ("breakfast", "lunch", "dinner", "snack")


class MealPlan(SQLModel, table=True):
    __tablename__ = "meal_plans"
    __table_args__ = (
        sa.CheckConstraint(
            "meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')",
            name="ck_meal_plans_meal_slot",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    household_id: uuid.UUID = Field(foreign_key="households.id", index=True)
    recipe_id: uuid.UUID = Field(foreign_key="recipes.id")
    planned_date: date
    meal_slot: str = Field(default="dinner")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
