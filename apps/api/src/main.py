import logging
import os
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .analytics import flush as posthog_flush
from .logging_config import configure_logging
from .request_context import set_request_id
from .routes import health_router, hello_router, ingest_router, me_router

configure_logging()
_logger = logging.getLogger(__name__)

app = FastAPI(
    title="Korb API",
    description="Backend API for Korb meal planning application",
    version="0.1.0",
)

# CORS: origins from CORS_ORIGINS env (comma-separated). Empty/unset = no origins.
_origins_raw = (os.getenv("CORS_ORIGINS") or "").strip()
_cors_origins = [o.strip() for o in _origins_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(hello_router)
app.include_router(ingest_router)
app.include_router(me_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    _request: Request, exc: Exception
) -> JSONResponse:
    """Return stable JSON 500 without leaking stack traces to the client."""
    _logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Generate or forward X-Request-ID and set in context for logging."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    set_request_id(request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    """Log request method, path, status, duration (PII-safe: no body or auth)."""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    _logger.info(
        "request method=%s path=%s status=%s duration_ms=%.2f",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.middleware("http")
async def flush_posthog(request: Request, call_next):
    """Flush PostHog after each request so events are sent (e.g. in serverless)."""
    response = await call_next(request)
    posthog_flush()
    return response
