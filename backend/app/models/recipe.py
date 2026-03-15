import uuid
from decimal import Decimal
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlmodel import SQLModel, Field


class Recipe(SQLModel, table=True):
    __tablename__ = "recipes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str
    description: str | None = None
    cost: Decimal = Field(sa_column=sa.Column(sa.Numeric(10, 2), nullable=False))
    time_minutes: int
    type: str  # protein, veggie, carb
    image_url: str | None = None
    household_id: uuid.UUID | None = Field(default=None, foreign_key="households.id", index=True)
    created_by: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RecipeIngredient(SQLModel, table=True):
    __tablename__ = "recipe_ingredients"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    recipe_id: uuid.UUID = Field(foreign_key="recipes.id")
    name: str
    quantity: str | None = None
    unit: str | None = None


class SwipeAction(SQLModel, table=True):
    __tablename__ = "swipe_actions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    recipe_id: uuid.UUID = Field(foreign_key="recipes.id", index=True)
    action: str  # accept / reject
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
