import uuid

from sqlmodel import SQLModel, Field


class Store(SQLModel, table=True):
    __tablename__ = "stores"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    brand: str  # migros, coop, aldi, lidl, denner
    latitude: float
    longitude: float
    address: str | None = None
