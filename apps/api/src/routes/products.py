"""Product search, comparison, deals, feedback, and Q&A via Qdrant hybrid search."""

from functools import cache
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from ..dependencies import get_current_user
from ..models.user import User
from ..schemas.product import ProductFeedbackRequest, ProductResponse
from ..services.llm_service import ask_llm
from ..services.product_service import (
    compare_products,
    get_deals,
    recommend_products,
    search_products_batch,
    search_products_hybrid,
    update_product_preference,
)

router = APIRouter(prefix="/api/v1/products", tags=["products"])

_PROMPTS_DIR = Path(__file__).parent.parent.parent / "prompts"


@cache
def _load_prompt(name: str) -> str:
    """Read a prompt markdown file from the prompts directory (cached)."""
    return (_PROMPTS_DIR / name).read_text(encoding="utf-8")


@router.get("/search", response_model=list[ProductResponse])
def search_products(
    q: str = Query(min_length=1, max_length=200),
    retailers: str | None = Query(default=None, max_length=500),
    max_price: float | None = Query(default=None, gt=0),
    category: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
    user: User = Depends(get_current_user),
):
    retailer_list = (
        [r.strip() for r in retailers.split(",") if r.strip()] if retailers else None
    )
    results = search_products_hybrid(
        q,
        retailer_list,
        max_price,
        category,
        limit=limit,
        user_id=str(user.id),
        household_id=str(user.household_id) if user.household_id else None,
    )
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


@router.get("/recommended", response_model=list[ProductResponse])
def recommended_products(
    retailers: str | None = Query(default=None, max_length=500),
    limit: int = Query(default=10, ge=1, le=50),
    user: User = Depends(get_current_user),
):
    """Get personalized recommendations from preference vector."""
    retailer_list = (
        [r.strip() for r in retailers.split(",") if r.strip()] if retailers else None
    )
    results = recommend_products(
        user_id=str(user.id),
        household_id=str(user.household_id) if user.household_id else None,
        retailers=retailer_list,
        limit=limit,
    )
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


class BatchSearchRequest(BaseModel):
    queries: list[str] = Field(min_length=1, max_length=20)
    retailers: list[str] | None = None
    max_price: float | None = None
    limit: int = Field(default=10, ge=1, le=50)


@router.post("/batch-search")
def batch_search(
    body: BatchSearchRequest,
    user: User = Depends(get_current_user),
):
    """Search for multiple queries at once (e.g., a list of ingredients)."""
    results = search_products_batch(
        queries=body.queries,
        retailers=body.retailers,
        max_price=body.max_price,
        limit=body.limit,
        user_id=str(user.id),
        household_id=str(user.household_id) if user.household_id else None,
    )
    return {
        query: [
            {
                "id": str(r.id),
                "retailer": r.payload.get("retailer"),
                "name": r.payload.get("name"),
                "price": r.payload.get("price"),
                "discount_pct": r.payload.get("discount_pct"),
                "score": r.score,
            }
            for r in points
        ]
        for query, points in results.items()
    }


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


@router.post("/feedback")
def product_feedback(
    body: ProductFeedbackRequest,
    user: User = Depends(get_current_user),
):
    update_product_preference(
        str(user.id),
        body.product_id,
        body.helpful,
        household_id=str(user.household_id) if user.household_id else None,
    )
    return {"status": "ok"}


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


# ---------------------------------------------------------------------------
# Product Q&A (RAG)
# ---------------------------------------------------------------------------


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class AskResponse(BaseModel):
    answer: str
    products: list[dict]


@router.post("/ask", response_model=AskResponse)
async def ask_products(
    body: AskRequest,
    user: User = Depends(get_current_user),
):
    """Answer a question about products using hybrid search + LLM."""
    results = search_products_hybrid(body.question, limit=10)

    # Build context block from search results.
    product_lines: list[str] = []
    product_dicts: list[dict] = []
    for r in results:
        p = r.payload
        name = p.get("name", "unknown")
        retailer = p.get("retailer", "unknown")
        price = p.get("price")
        discount = p.get("discount_pct")
        category = p.get("category", "")
        line = f"- {name} ({retailer})"
        if price is not None:
            line += f" CHF {price}"
        if discount:
            line += f" ({discount}% off)"
        if category:
            line += f" [{category}]"
        product_lines.append(line)
        product_dicts.append(
            {
                "id": str(r.id),
                "retailer": retailer,
                "name": name,
                "price": price,
                "discount_pct": discount,
                "category": category,
            }
        )

    context = "\n".join(product_lines) if product_lines else "No products found."

    system_prompt = _load_prompt("product-qa.md")
    user_prompt = f"Product data:\n{context}\n\nQuestion: {body.question}"

    answer = await ask_llm(user_prompt, system=system_prompt)
    return AskResponse(answer=answer, products=product_dicts)
