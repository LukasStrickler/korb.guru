from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.product import ProductResponse
from app.services.product_service import search_products_hybrid, compare_products, get_deals

router = APIRouter()


@router.get("/search", response_model=list[ProductResponse])
def search_products(
    q: str = Query(min_length=1, max_length=200),
    retailers: str | None = Query(default=None, max_length=500),
    max_price: float | None = Query(default=None, gt=0),
    category: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
    user: User = Depends(get_current_user),
):
    retailer_list = [r.strip() for r in retailers.split(",") if r.strip()] if retailers else None
    results = search_products_hybrid(q, retailer_list, max_price, category, limit)
    return [
        ProductResponse(
            id=r.id,
            retailer=r.payload.get("retailer", ""),
            name=r.payload.get("name", ""),
            description=None,
            price=r.payload.get("price"),
            original_price=None,
            discount_pct=r.payload.get("discount_pct"),
            category=r.payload.get("category"),
            image_url=None,
            valid_from=r.payload.get("valid_from"),
            valid_to=r.payload.get("valid_to"),
            score=r.score,
        )
        for r in results
    ]


@router.get("/compare")
def compare(
    ingredient: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=10, ge=1, le=50),
    user: User = Depends(get_current_user),
):
    results = compare_products(ingredient, limit)
    return [
        {
            "id": r.id,
            "retailer": r.payload.get("retailer"),
            "name": r.payload.get("name"),
            "price": r.payload.get("price"),
            "discount_pct": r.payload.get("discount_pct"),
            "score": r.score,
        }
        for r in results
    ]


@router.get("/deals")
def deals(
    limit: int = Query(default=20, ge=1, le=50),
    user: User = Depends(get_current_user),
):
    results = get_deals(limit)
    return [
        {
            "id": r.id,
            "retailer": r.payload.get("retailer"),
            "name": r.payload.get("name"),
            "price": r.payload.get("price"),
            "discount_pct": r.payload.get("discount_pct"),
        }
        for r in results
    ]
