"""Route optimization — shopping route planning."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..dependencies import get_current_user
from ..models.store import Store
from ..models.user import User
from ..schemas.route import RouteOptimizeRequest, RouteResponse, RouteStop
from ..services.route_service import optimize_route as _optimize

router = APIRouter(prefix="/api/v1/route", tags=["route"])


@router.post("/optimize", response_model=RouteResponse)
async def optimize_route(
    body: RouteOptimizeRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    time_limit = max(body.time_limit, 5)
    result = await _optimize(body.selected_shops, time_limit, session)
    return RouteResponse(
        saved=result["saved"],
        time=result["time"],
        stops=[RouteStop(**s) for s in result["stops"]],
    )


@router.get("/stores")
async def get_stores(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(select(Store))
    return result.scalars().all()
