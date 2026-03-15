"""Grocery list service — generates shopping lists from meal plans."""

import re
import uuid
from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.grocery import GroceryItem, GroceryList
from ..models.meal_plan import MealPlan
from ..models.recipe import Recipe, RecipeIngredient


def _parse_quantity(qty: str | None) -> tuple[float, str]:
    if not qty:
        return (0.0, "")
    match = re.match(r"^([\d.]+)\s*(.*)$", qty.strip())
    if match:
        return (float(match.group(1)), match.group(2).strip())
    # Preserve non-numeric quantities (e.g. "a pinch", "to taste")
    return (0.0, qty.strip())


def _format_quantity(amount: float, unit: str) -> str:
    if amount == int(amount):
        amount_str = str(int(amount))
    else:
        amount_str = f"{amount:.1f}"
    return f"{amount_str}{unit}" if unit else amount_str


async def generate_grocery_list(
    household_id: uuid.UUID,
    start_date: date,
    end_date: date,
    session: AsyncSession,
) -> GroceryList:
    """Generate aggregated grocery list from meal plans in the date range."""
    plans_result = await session.execute(
        select(MealPlan).where(
            MealPlan.household_id == household_id,
            MealPlan.planned_date >= start_date,
            MealPlan.planned_date <= end_date,
        )
    )
    plans = plans_result.scalars().all()

    recipe_counts: dict[uuid.UUID, int] = defaultdict(int)
    for plan in plans:
        recipe_counts[plan.recipe_id] += 1

    recipe_ids = list(recipe_counts.keys())

    recipes: dict[uuid.UUID, Recipe] = {}
    if recipe_ids:
        recipes_result = await session.execute(
            select(Recipe).where(Recipe.id.in_(recipe_ids))
        )
        recipes = {r.id: r for r in recipes_result.scalars().all()}

    all_ings: list[RecipeIngredient] = []
    if recipe_ids:
        ings_result = await session.execute(
            select(RecipeIngredient).where(RecipeIngredient.recipe_id.in_(recipe_ids))
        )
        all_ings = list(ings_result.scalars().all())

    ings_by_recipe: dict[uuid.UUID, list[RecipeIngredient]] = defaultdict(list)
    for ing in all_ings:
        ings_by_recipe[ing.recipe_id].append(ing)

    accumulated: dict[
        str, tuple[float, str, str]
    ] = {}  # agg_key -> (amount, unit, original_name)
    total = Decimal("0")
    for recipe_id, count in recipe_counts.items():
        recipe = recipes.get(recipe_id)
        if not recipe:
            continue
        total += recipe.cost * count
        for ing in ings_by_recipe.get(recipe_id, []):
            amount, qty_unit = _parse_quantity(ing.quantity)
            # Prefer the dedicated unit column; fall back to unit parsed from quantity
            unit = ing.unit or qty_unit
            key = ing.name.lower()
            agg_unit = unit.lower() if unit else ""
            agg_key = f"{key}||{agg_unit}"
            if agg_key in accumulated:
                existing_amount, existing_unit, _ = accumulated[agg_key]
                accumulated[agg_key] = (
                    existing_amount + amount * count,
                    existing_unit,
                    ing.name,
                )
            else:
                accumulated[agg_key] = (amount * count, unit, ing.name)

    grocery_list = GroceryList(
        household_id=household_id,
        name=f"List {start_date} - {end_date}",
        date_range_start=start_date,
        date_range_end=end_date,
        estimated_total=total,
    )
    session.add(grocery_list)
    await session.flush()

    for _agg_key, (amount, unit, original_name) in accumulated.items():
        qty_str = _format_quantity(amount, unit) if amount > 0 else None
        item = GroceryItem(
            grocery_list_id=grocery_list.id,
            ingredient_name=original_name,
            quantity=qty_str,
        )
        session.add(item)
    await session.commit()

    return grocery_list
