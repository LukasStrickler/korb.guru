"""Route optimization service — nearest-neighbor heuristic for shopping routes."""

import logging
import math

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.store import Store

logger = logging.getLogger(__name__)


async def optimize_route(
    selected_shops: list[str],
    time_limit: int,
    session: AsyncSession,
) -> dict:
    stores_result = await session.execute(
        select(Store).where(Store.name.in_(selected_shops))
    )
    stores = stores_result.scalars().all()

    if not stores:
        stops = []
        for i, shop in enumerate(selected_shops):
            stops.append(
                {
                    "name": shop,
                    "task": "Buy fresh ingredients" if i == 0 else "Rest of items",
                    "distance": f"{0.8 + i * 0.7:.1f}km",
                    "latitude": None,
                    "longitude": None,
                }
            )
        return {"saved": 0.0, "time": max(0, time_limit - 5), "stops": stops}

    ordered = _nearest_neighbor_order(list(stores))
    stops = []
    tasks = ["Buy fresh ingredients", "Buy pantry staples", "Rest of items"]
    for i, store in enumerate(ordered):
        distance = (
            _distance_km(
                ordered[i - 1].latitude,
                ordered[i - 1].longitude,
                store.latitude,
                store.longitude,
            )
            if i > 0
            else 0.0
        )
        stops.append(
            {
                "name": store.name,
                "task": tasks[min(i, len(tasks) - 1)],
                "distance": f"{distance:.1f}km",
                "latitude": store.latitude,
                "longitude": store.longitude,
            }
        )

    estimated_time = max(0, min(time_limit - 5, len(stops) * 12))
    return {"saved": 0.0, "time": estimated_time, "stops": stops}


def _nearest_neighbor_order(stores: list) -> list:
    if len(stores) <= 1:
        return list(stores)
    remaining = list(stores)
    ordered = [remaining.pop(0)]
    while remaining:
        current = ordered[-1]
        nearest = min(
            remaining,
            key=lambda s: _distance_km(
                current.latitude, current.longitude, s.latitude, s.longitude
            ),
        )
        remaining.remove(nearest)
        ordered.append(nearest)
    return ordered


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return earth_radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
