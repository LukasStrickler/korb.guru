"""Route optimization service."""
import logging
import math
import os

from sqlmodel import Session, select

from app.models.store import Store

logger = logging.getLogger(__name__)

MAX_ROUTE_STOPS = int(os.getenv("MAX_ROUTE_STOPS", "10"))


def optimize_route(
    selected_shops: list[str],
    time_limit: int,
    session: Session,
    *,
    budget_limit: float = 80.0,
) -> dict:
    """
    Calculate optimal shopping route across selected stores.
    Uses nearest-neighbor heuristic for store ordering.
    """
    all_stores = session.exec(
        select(Store)
        .where(Store.brand.in_(selected_shops))  # type: ignore
        .order_by(Store.brand, Store.name)
    ).all()

    # Keep only one branch per brand (the first found) to avoid expanding into every location
    seen_brands: set[str] = set()
    stores: list[Store] = []
    for s in all_stores:
        if s.brand not in seen_brands:
            seen_brands.add(s.brand)
            stores.append(s)

    if not stores:
        # Fallback with deterministic mock data for all selected shops
        stops = []
        for i, shop in enumerate(selected_shops):
            stops.append({
                "name": shop,
                "task": "Buy fresh ingredients" if i == 0 else "Rest of items",
                "distance": f"{0.8 + i * 0.7:.1f}km",
                "latitude": None,
                "longitude": None,
            })
        if len(selected_shops) > len(stops):
            logger.warning(
                "Fallback mock: %d shops requested, %d returned",
                len(selected_shops), len(stops),
            )
        return {
            "saved": 0.0,
            "time": time_limit - 5,
            "stops": stops,
        }

    # Nearest-neighbor ordering from first store, capped to MAX_ROUTE_STOPS
    full_order = _nearest_neighbor_order(stores)
    if len(full_order) > MAX_ROUTE_STOPS:
        logger.warning(
            "Route capped from %d to %d stops (MAX_ROUTE_STOPS)",
            len(full_order), MAX_ROUTE_STOPS,
        )
    ordered = full_order[:MAX_ROUTE_STOPS]

    stops = []
    tasks = ["Buy fresh ingredients", "Buy pantry staples", "Rest of items"]
    for i, store in enumerate(ordered):
        distance = _distance_km(
            ordered[i - 1].latitude if i > 0 else store.latitude,
            ordered[i - 1].longitude if i > 0 else store.longitude,
            store.latitude,
            store.longitude,
        ) if i > 0 else 0.0

        stops.append({
            "name": store.name,
            "task": tasks[min(i, len(tasks) - 1)],
            "distance": f"{distance:.1f}km",
            "latitude": store.latitude,
            "longitude": store.longitude,
        })

    total_distance = sum(
        float(s["distance"].replace("km", "")) for s in stops
    )
    saved = max(0.0, budget_limit - total_distance * 2.0)
    estimated_time = min(time_limit - 5, len(stops) * 12)

    return {
        "saved": saved,
        "time": estimated_time,
        "stops": stops,
    }


def _nearest_neighbor_order(stores: list[Store]) -> list[Store]:
    """Simple nearest-neighbor heuristic for route ordering."""
    if len(stores) <= 1:
        return list(stores)

    remaining = list(stores)
    ordered = [remaining.pop(0)]

    while remaining:
        current = ordered[-1]
        nearest = min(
            remaining,
            key=lambda s: _distance_km(current.latitude, current.longitude, s.latitude, s.longitude),
        )
        remaining.remove(nearest)
        ordered.append(nearest)

    return ordered


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance between two points in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
