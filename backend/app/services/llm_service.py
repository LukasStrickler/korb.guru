"""
LLM Service - OpenRouter integration via Apify proxy.

Uses Apify's OpenRouter Actor proxy for LLM calls:
- Product categorization
- Description enrichment
- Ingredient extraction from product names
"""
import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.apify.actor/api/v1"

_client: httpx.Client | None = None

VALID_CATEGORIES = frozenset({
    "dairy", "meat", "fish", "vegetables", "fruits", "bakery",
    "frozen", "beverages", "snacks", "pantry", "household", "personal_care", "other",
})


def _sanitize(text: str) -> str:
    """Strip control characters and limit length to prevent prompt injection."""
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", text)
    return cleaned[:200]


def _get_client() -> httpx.Client:
    global _client
    if _client is None or _client.is_closed:
        if not settings.apify_token:
            raise ValueError("APIFY_TOKEN required for LLM calls via OpenRouter")
        _client = httpx.Client(
            base_url=OPENROUTER_BASE_URL,
            headers={
                "Authorization": f"Bearer {settings.apify_token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
    return _client


def _chat(prompt: str, max_tokens: int = 20) -> str:
    """Send a single chat completion request and return the content."""
    resp = _get_client().post(
        "/chat/completions",
        json={
            "model": "anthropic/claude-3-haiku",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
        },
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def categorize_product(product_name: str, product_description: str | None = None) -> str:
    """Categorize a product into a grocery category using LLM."""
    name = _sanitize(product_name)
    desc_line = f"\nDescription: {_sanitize(product_description)}" if product_description else ""
    prompt = (
        "Categorize this Swiss grocery product into exactly one category.\n"
        "Categories: dairy, meat, fish, vegetables, fruits, bakery, frozen, beverages, snacks, pantry, household, personal_care, other\n\n"
        f"Product: {name}{desc_line}\n\n"
        "Reply with ONLY the category name, nothing else."
    )
    try:
        category = _chat(prompt, max_tokens=20).lower()
        return category if category in VALID_CATEGORIES else "other"
    except Exception as e:
        logger.warning("LLM categorization failed for %r: %s", product_name, e)
        return "other"


def enrich_product_description(product_name: str, retailer: str) -> str:
    """Generate a short product description using LLM."""
    name = _sanitize(product_name)
    ret = _sanitize(retailer)
    prompt = (
        "Write a one-sentence product description (max 20 words) for this Swiss grocery product.\n\n"
        f"Product: {name}\nRetailer: {ret}\n\n"
        "Reply with ONLY the description, nothing else."
    )
    try:
        return _chat(prompt, max_tokens=50)
    except Exception as e:
        logger.warning("LLM enrichment failed for %r: %s", product_name, e)
        return ""


def extract_ingredients(product_name: str) -> list[str]:
    """Extract likely ingredients from a product name using LLM."""
    name = _sanitize(product_name)
    prompt = (
        "Extract the main food ingredients from this product name. Return as comma-separated list.\n"
        'If it\'s not a food product, return "none".\n\n'
        f"Product: {name}\n\n"
        "Reply with ONLY the comma-separated ingredients, nothing else."
    )
    try:
        result = _chat(prompt, max_tokens=100)
        if result.lower() == "none":
            return []
        return [i.strip() for i in result.split(",") if i.strip()]
    except Exception as e:
        logger.warning("LLM ingredient extraction failed for %r: %s", product_name, e)
        return []


def categorize_products_batch(products: list[dict]) -> list[dict]:
    """Categorize multiple products. Enriches each with a 'category' field."""
    for product in products:
        if not product.get("category"):
            product["category"] = categorize_product(
                product.get("name", ""),
                product.get("description"),
            )
    return products
