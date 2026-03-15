import uuid
from datetime import date
from enum import Enum
from pydantic import BaseModel


class MealSlot(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"


class MealPlanCreate(BaseModel):
    recipe_id: uuid.UUID
    planned_date: date
    meal_slot: MealSlot = MealSlot.dinner


class MealPlanResponse(BaseModel):
    id: uuid.UUID
    recipe_id: uuid.UUID
    planned_date: date
    meal_slot: str
