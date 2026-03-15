import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_user, get_household_id, get_pagination, Pagination
from app.models.user import User
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe, RecipeIngredient
from app.models.grocery import GroceryList, GroceryItem
from app.schemas.meal_plan import MealPlanCreate, MealPlanResponse
from app.services.grocery_service import generate_grocery_list as _generate_grocery_list

router = APIRouter()


@router.post("", response_model=MealPlanResponse)
def add_to_plan(
    body: MealPlanCreate,
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    recipe = session.get(Recipe, body.recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    # Only allow planning with public recipes or recipes owned by the household
    if recipe.household_id is not None and recipe.household_id != household_id:
        raise HTTPException(status_code=403, detail="Recipe does not belong to your household")
    plan = MealPlan(household_id=household_id, recipe_id=body.recipe_id, planned_date=body.planned_date, meal_slot=body.meal_slot)
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@router.get("", response_model=list[MealPlanResponse])
def get_meal_plans(
    start: date | None = None,
    end: date | None = None,
    household_id: uuid.UUID = Depends(get_household_id),
    pagination: Pagination = Depends(get_pagination),
    session: Session = Depends(get_session),
):
    query = select(MealPlan).where(MealPlan.household_id == household_id)
    if start:
        query = query.where(MealPlan.planned_date >= start)
    if end:
        query = query.where(MealPlan.planned_date <= end)
    return session.exec(query.order_by(MealPlan.planned_date).offset(pagination.offset).limit(pagination.limit)).all()


@router.delete("/{plan_id}")
def delete_plan(plan_id: uuid.UUID, household_id: uuid.UUID = Depends(get_household_id), session: Session = Depends(get_session)):
    plan = session.get(MealPlan, plan_id)
    if not plan or plan.household_id != household_id:
        raise HTTPException(status_code=404, detail="Plan not found")
    session.delete(plan)
    session.commit()
    return {"status": "deleted"}


@router.post("/generate-grocery-list")
def generate_grocery_list(
    start: date,
    end: date,
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    grocery_list = _generate_grocery_list(household_id, start, end, session)
    items = session.exec(
        select(GroceryItem).where(GroceryItem.grocery_list_id == grocery_list.id)
    ).all()
    return {
        "grocery_list_id": str(grocery_list.id),
        "item_count": len(items),
        "estimated_total": float(grocery_list.estimated_total),
    }
