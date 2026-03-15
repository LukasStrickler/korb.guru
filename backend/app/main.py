from contextlib import asynccontextmanager
import logging
import sys

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import settings
from app.limiter import limiter
from app.database import create_db_and_tables
from app.qdrant.collections import init_collections
from app.routers import (
    auth,
    users,
    households,
    recipes,
    meal_plans,
    grocery,
    messages,
    polls,
    route,
    budget,
    notifications,
    products,
    receipts,
)

# --- Structured JSON logging ---
json_handler = logging.StreamHandler(sys.stdout)
json_handler.setFormatter(
    logging.Formatter(
        '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}'
    )
)
logging.root.handlers = [json_handler]
logging.root.setLevel(settings.log_level)
logger = logging.getLogger(__name__)

# --- Rate limiter (shared instance from app.limiter) ---


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting korb.guru backend...")
    create_db_and_tables()
    init_collections()
    logger.info("Database tables and Qdrant collections ready.")
    yield
    logger.info("Shutting down korb.guru backend.")


app = FastAPI(
    title="korb.guru API",
    description="AI-powered meal planning & smart grocery shopping for households in Zürich",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- RFC 7807 error responses ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [{k: v for k, v in e.items() if k != "ctx"} for e in exc.errors()]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "type": "validation_error",
            "title": "Validation Error",
            "status": 422,
            "detail": "One or more fields failed validation.",
            "errors": errors,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "type": "internal_error",
            "title": "Internal Server Error",
            "status": 500,
            "detail": "An unexpected error occurred.",
        },
    )


# --- Prometheus metrics ---
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(households.router, prefix="/api/v1/households", tags=["Households"])
app.include_router(recipes.router, prefix="/api/v1/recipes", tags=["Recipes"])
app.include_router(meal_plans.router, prefix="/api/v1/meal-plans", tags=["Meal Plans"])
app.include_router(grocery.router, prefix="/api/v1/grocery", tags=["Grocery"])
app.include_router(messages.router, prefix="/api/v1/messages", tags=["Messages"])
app.include_router(polls.router, prefix="/api/v1/polls", tags=["Polls"])
app.include_router(route.router, prefix="/api/v1/route", tags=["Route"])
app.include_router(budget.router, prefix="/api/v1/budget", tags=["Budget"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
app.include_router(receipts.router, prefix="/api/v1/receipts", tags=["Receipts"])


@app.get("/health")
def health():
    return {"status": "ok"}
