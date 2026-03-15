"""Route schemas."""

from pydantic import BaseModel


class RouteOptimizeRequest(BaseModel):
    selected_shops: list[str]
    time_limit: int = 45


class RouteStop(BaseModel):
    name: str
    task: str
    distance: str
    latitude: float | None = None
    longitude: float | None = None


class RouteResponse(BaseModel):
    saved: float
    time: int
    stops: list[RouteStop]
