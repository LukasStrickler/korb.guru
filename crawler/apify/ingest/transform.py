"""Normalize product data from Apify Actor output into a common format."""
import logging

logger = logging.getLogger(__name__)

PRICE_MIN = 0.10
PRICE_MAX = 500.0


def normalize_items(items: list[dict], source: str) -> list[dict]:
    """Normalize items from Actor output into common product schema."""
    normalized = []

    for item in items:
        try:
            price = _extract_price(item)
            original_price = _extract_float(item.get("originalPrice") or item.get("regularPrice"))

            # Validate prices
            price = _validate_price(price)
            original_price = _validate_price(original_price)

            discount_pct = _extract_float(item.get("discount") or item.get("discountPercent") or item.get("discount_pct"))

            product = {
                "retailer": _detect_retailer(item, source),
                "name": item.get("name") or item.get("title") or item.get("productName", ""),
                "description": item.get("description") or item.get("desc", ""),
                "price": price,
                "original_price": original_price,
                "discount_pct": discount_pct,
                "category": item.get("category") or item.get("categoryName", ""),
                "image_url": item.get("image") or item.get("imageUrl") or item.get("img") or item.get("image_url", ""),
                "source": "apify",
            }

            # Calculate discount if we have both prices but no explicit discount
            if product["price"] and product["original_price"] and not product["discount_pct"]:
                if product["original_price"] > product["price"]:
                    product["discount_pct"] = round(
                        (1 - product["price"] / product["original_price"]) * 100, 1
                    )

            name = product["name"].strip()
            if name and len(name) >= 2:
                product["name"] = name
                normalized.append(product)
        except Exception as e:
            logger.warning(f"Failed to normalize item: {e}")

    logger.info(f"Normalized {len(normalized)}/{len(items)} items from {source}")
    return normalized


def _detect_retailer(item: dict, source: str) -> str:
    if source in ("aldi", "lidl", "migros", "coop", "denner"):
        return source
    return (
        item.get("retailer")
        or item.get("store")
        or item.get("chain", "")
    ).lower() or source


def _extract_price(item: dict) -> float | None:
    for key in ("price", "currentPrice", "salePrice", "priceNum"):
        val = item.get(key)
        if val is not None:
            return _extract_float(val)
    return None


def _extract_float(val) -> float | None:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return round(float(val), 2)
    try:
        cleaned = str(val).replace("CHF", "").replace(",", ".").replace("Fr.", "").strip()
        return round(float(cleaned), 2)
    except (ValueError, TypeError):
        return None


def _validate_price(price: float | None) -> float | None:
    """Return price only if within valid range."""
    if price is None:
        return None
    if PRICE_MIN <= price <= PRICE_MAX:
        return price
    return None
