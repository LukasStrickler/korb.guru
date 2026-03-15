import uuid
from enum import Enum

from pydantic import BaseModel, Field


class RecipeType(str, Enum):
    protein = "protein"
    veggie = "veggie"
    carb = "carb"


class SwipeAction(str, Enum):
    accept = "accept"
    reject = "reject"


class IngredientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    quantity: str | None = Field(default=None, max_length=50)
    unit: str | None = Field(default=None, max_length=50)


class RecipeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    cost: float = Field(ge=0)
    time_minutes: int = Field(ge=1)
    type: RecipeType
    image_url: str | None = Field(default=None, max_length=500)
    ingredients: list[IngredientCreate] = Field(default=[], max_length=50)


class RecipeResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    cost: float
    time_minutes: int
    type: str
    image_url: str | None
    ingredients: list[IngredientCreate] = []


class SwipeRequest(BaseModel):
    action: SwipeAction
