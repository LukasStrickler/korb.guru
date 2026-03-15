import uuid
from pydantic import BaseModel, Field


class GroceryListResponse(BaseModel):
    id: uuid.UUID
    name: str
    estimated_total: float
    items: list["GroceryItemResponse"] = []


class GroceryItemResponse(BaseModel):
    id: uuid.UUID
    ingredient_name: str
    quantity: str | None
    is_checked: bool


class GroceryItemUpdate(BaseModel):
    is_checked: bool | None = None


class BulkCheckItem(BaseModel):
    item_id: uuid.UUID
    is_checked: bool


class BulkCheckRequest(BaseModel):
    updates: list[BulkCheckItem] = Field(min_length=1, max_length=100)


class GroceryItemCreate(BaseModel):
    ingredient_name: str = Field(min_length=1, max_length=200)
    quantity: str | None = Field(default=None, max_length=50)


class BulkItemCreateRequest(BaseModel):
    items: list[GroceryItemCreate] = Field(min_length=1, max_length=100)
