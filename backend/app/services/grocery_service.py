"""Grocery list service."""
import re
import uuid
from collections import defaultdict
from datetime import date

from sqlmodel import Session, select

from app.models.grocery import GroceryList, GroceryItem
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe, RecipeIngredient


def _parse_quantity(qty: str | None) -> tuple[float, str]:
    """Parse a quantity string like '200g' into (200.0, 'g'). Returns (0, '') on failure."""
    if not qty:
        return (0.0, "")
    match = re.match(r"^([\d.]+)\s*(.*)$", qty.strip())
    if match:
        return (float(match.group(1)), match.group(2).strip())
    return (0.0, qty.strip())


def _format_quantity(amount: float, unit: str) -> str:
    """Format amount + unit back into a string."""
    if amount == int(amount):
        amount_str = str(int(amount))
    else:
        amount_str = f"{amount:.1f}"
    return f"{amount_str}{unit}" if unit else amount_str


def generate_grocery_list(
    household_id: uuid.UUID,
    start_date: date,
    end_date: date,
    session: Session,
) -> GroceryList:
    """Generate a grocery list from meal plans in the date range, summing quantities per ingredient."""
    plans = session.exec(
        select(MealPlan).where(
            MealPlan.household_id == household_id,
            MealPlan.planned_date >= start_date,
            MealPlan.planned_date <= end_date,
        )
    ).all()

    # Count how many times each recipe appears in the plan
    recipe_counts: dict[uuid.UUID, int] = defaultdict(int)
    for plan in plans:
        recipe_counts[plan.recipe_id] += 1

    recipe_ids = list(recipe_counts.keys())
    recipes = {r.id: r for r in session.exec(select(Recipe).where(Recipe.id.in_(recipe_ids))).all()} if recipe_ids else {}  # type: ignore
    all_ings = session.exec(select(RecipeIngredient).where(RecipeIngredient.recipe_id.in_(recipe_ids))).all() if recipe_ids else []  # type: ignore

    # Group ingredients by recipe_id
    ings_by_recipe: dict[uuid.UUID, list[RecipeIngredient]] = defaultdict(list)
    for ing in all_ings:
        ings_by_recipe[ing.recipe_id].append(ing)

    # Accumulate quantities: multiply by how many times the recipe is planned
    accumulated: dict[str, tuple[float, str]] = {}
    total = 0.0
    for recipe_id, count in recipe_counts.items():
        recipe = recipes.get(recipe_id)
        if not recipe:
            continue
        total += recipe.cost * count
        for ing in ings_by_recipe.get(recipe_id, []):
            amount, unit = _parse_quantity(ing.quantity)
            key = ing.name.lower()
            if key in accumulated:
                existing_amount, existing_unit = accumulated[key]
                # Only sum if same unit (or both unitless)
                if existing_unit == unit:
                    accumulated[key] = (existing_amount + amount * count, unit)
                else:
                    # Different units — keep as separate entry with original name
                    alt_key = f"{ing.name.lower()} ({unit})"
                    prev_amount, _ = accumulated.get(alt_key, (0.0, unit))
                    accumulated[alt_key] = (prev_amount + amount * count, unit)
            else:
                accumulated[key] = (amount * count, unit)

    grocery_list = GroceryList(
        household_id=household_id,
        name=f"List {start_date} - {end_date}",
        date_range_start=start_date,
        date_range_end=end_date,
        estimated_total=total,
    )
    session.add(grocery_list)
    session.flush()  # Assign ID without committing — single transaction for list + items

    for name, (amount, unit) in accumulated.items():
        qty_str = _format_quantity(amount, unit) if amount > 0 else None
        item = GroceryItem(grocery_list_id=grocery_list.id, ingredient_name=name, quantity=qty_str)
        session.add(item)
    session.commit()

    return grocery_list
