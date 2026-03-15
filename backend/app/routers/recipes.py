import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_user, get_household_id, get_pagination, Pagination
from app.models.user import User
from app.models.recipe import Recipe, RecipeIngredient, SwipeAction
from app.schemas.recipe import RecipeCreate, RecipeResponse, SwipeRequest
from app.services.recipe_service import (
    upsert_recipe_embedding,
    search_recipes_semantic,
    get_recommendations,
    update_user_preference,
)
from app.services.discovery_service import discover_with_context, get_discovery_metrics

router = APIRouter()


@router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_recipe(
    body: RecipeCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    recipe = Recipe(
        title=body.title,
        description=body.description,
        cost=body.cost,
        time_minutes=body.time_minutes,
        type=body.type,
        image_url=body.image_url,
        household_id=user.household_id,
        created_by=user.id,
    )
    session.add(recipe)
    session.commit()
    session.refresh(recipe)

    for ing in body.ingredients:
        ingredient = RecipeIngredient(recipe_id=recipe.id, name=ing.name, quantity=ing.quantity, unit=ing.unit)
        session.add(ingredient)
    session.commit()

    upsert_recipe_embedding(recipe, body.ingredients)
    return _recipe_response(recipe, session)


@router.get("", response_model=list[RecipeResponse])
def list_recipes(
    household_id: uuid.UUID = Depends(get_household_id),
    pagination: Pagination = Depends(get_pagination),
    session: Session = Depends(get_session),
):
    recipes = session.exec(
        select(Recipe)
        .where((Recipe.household_id == household_id) | (Recipe.household_id.is_(None)))  # type: ignore
        .offset(pagination.offset)
        .limit(pagination.limit)
    ).all()
    return _recipe_responses(list(recipes), session)


@router.get("/search", response_model=list[RecipeResponse])
def search_recipes(
    q: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    results = search_recipes_semantic(q, household_id=str(user.household_id) if user.household_id else None)
    recipe_ids = [uuid.UUID(r.id) for r in results]
    recipes = [session.get(Recipe, rid) for rid in recipe_ids]
    return _recipe_responses([r for r in recipes if r], session)


@router.get("/discover", response_model=list[RecipeResponse])
def discover(
    q: str | None = None,
    user: User = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    results = discover_with_context(
        str(user.id), session, target_text=q,
        household_id=str(household_id),
    )
    recipe_ids = [uuid.UUID(r.id) for r in results]
    recipes = [session.get(Recipe, rid) for rid in recipe_ids]
    # Post-filter: only return public recipes or ones in the user's household
    return _recipe_responses(
        [r for r in recipes if r and (r.household_id is None or r.household_id == household_id)],
        session,
    )


@router.get("/discovery-metrics")
def discovery_metrics(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return get_discovery_metrics(str(user.id), session)


@router.get("/recommendations", response_model=list[RecipeResponse])
def recommendations(
    user: User = Depends(get_current_user),
    household_id: uuid.UUID = Depends(get_household_id),
    session: Session = Depends(get_session),
):
    results = get_recommendations(
        str(user.id), session,
        household_id=str(household_id),
    )
    recipe_ids = [uuid.UUID(r.id) for r in results]
    recipes = [session.get(Recipe, rid) for rid in recipe_ids]
    # Post-filter: only return public recipes or ones in the user's household
    return _recipe_responses(
        [r for r in recipes if r and (r.household_id is None or r.household_id == household_id)],
        session,
    )


@router.post("/{recipe_id}/swipe")
def swipe_recipe(
    recipe_id: uuid.UUID,
    body: SwipeRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    # Only allow swiping on public recipes or recipes in the user's household
    if recipe.household_id is not None and recipe.household_id != user.household_id:
        raise HTTPException(status_code=404, detail="Recipe not found")
    swipe = SwipeAction(user_id=user.id, recipe_id=recipe_id, action=body.action)
    session.add(swipe)
    session.commit()
    update_user_preference(str(user.id), recipe, body.action)
    return {"status": "ok"}


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    # Only allow access to public recipes or recipes in the user's household
    if recipe.household_id is not None and recipe.household_id != user.household_id:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _recipe_response(recipe, session)


def _recipe_responses(recipes: list[Recipe], session: Session) -> list[RecipeResponse]:
    if not recipes:
        return []
    recipe_ids = [r.id for r in recipes]
    all_ingredients = session.exec(
        select(RecipeIngredient).where(RecipeIngredient.recipe_id.in_(recipe_ids))  # type: ignore
    ).all()
    ingredients_by_recipe: dict[uuid.UUID, list[RecipeIngredient]] = {}
    for ing in all_ingredients:
        ingredients_by_recipe.setdefault(ing.recipe_id, []).append(ing)
    return [
        RecipeResponse(
            id=r.id,
            title=r.title,
            description=r.description,
            cost=r.cost,
            time_minutes=r.time_minutes,
            type=r.type,
            image_url=r.image_url,
            ingredients=[{"name": i.name, "quantity": i.quantity, "unit": i.unit} for i in ingredients_by_recipe.get(r.id, [])],
        )
        for r in recipes
    ]


def _recipe_response(recipe: Recipe, session: Session) -> RecipeResponse:
    return _recipe_responses([recipe], session)[0]
