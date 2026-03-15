import uuid
from decimal import Decimal
from datetime import date, datetime, timezone

import sqlalchemy as sa
from sqlmodel import SQLModel, Field


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    retailer: str = Field(index=True)  # migros, coop, aldi, lidl, denner
    name: str
    description: str | None = None
    price: Decimal | None = Field(default=None, sa_column=sa.Column(sa.Numeric(10, 2), nullable=True))
    original_price: Decimal | None = Field(default=None, sa_column=sa.Column(sa.Numeric(10, 2), nullable=True))
    discount_pct: float | None = None
    category: str | None = Field(default=None, index=True)
    image_url: str | None = None
    valid_from: date | None = None
    valid_to: date | None = None
    source: str = Field(default="custom")  # custom / apify
    crawled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
