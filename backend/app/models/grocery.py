import uuid
from datetime import date, datetime, timezone

from sqlmodel import SQLModel, Field


class GroceryList(SQLModel, table=True):
    __tablename__ = "grocery_lists"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    household_id: uuid.UUID = Field(foreign_key="households.id", index=True)
    name: str = Field(default="Shopping List")
    date_range_start: date | None = None
    date_range_end: date | None = None
    estimated_total: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GroceryItem(SQLModel, table=True):
    __tablename__ = "grocery_items"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    grocery_list_id: uuid.UUID = Field(foreign_key="grocery_lists.id", index=True)
    ingredient_name: str
    quantity: str | None = None
    is_checked: bool = Field(default=False)
