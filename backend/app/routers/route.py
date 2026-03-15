from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_user
from app.models.store import Store
from app.models.user import User
from app.schemas.route import RouteOptimizeRequest, RouteResponse, RouteStop
from app.services.route_service import optimize_route as _optimize

router = APIRouter()


@router.post("/optimize", response_model=RouteResponse)
def optimize_route(
    body: RouteOptimizeRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    result = _optimize(body.selected_shops, body.time_limit, session, budget_limit=body.budget_limit)
    return RouteResponse(
        saved=result["saved"],
        time=result["time"],
        stops=[RouteStop(**s) for s in result["stops"]],
    )


@router.get("/stores")
def get_stores(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return session.exec(select(Store)).all()
