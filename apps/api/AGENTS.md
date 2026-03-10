# API AGENTS.md

## OVERVIEW

FastAPI Python backend with Clerk JWT auth, PostHog analytics, per-IP rate limiting, and OpenAPI schema generation.

## STRUCTURE

```
src/
  main.py              # FastAPI app, middleware, exception handlers
  auth.py              # Clerk JWT auth, ingest API key auth
  analytics.py         # PostHog server-side capture
  ingest_ratelimit.py  # Per-IP exponential backoff
  logging_config.py    # Structured logging setup
  request_context.py   # Request-scoped context utilities
  routes/
    __init__.py        # Export all routers
    health.py          # GET /health
    hello.py           # GET /hello
    me.py              # GET/DELETE /me (Clerk auth)
    ingest.py          # POST /ingest (API key auth)
scripts/
  export_openapi.py    # Export OpenAPI → openapi.json
```

## WHERE TO LOOK

| Task               | Location                    | Notes                                                              |
| ------------------ | --------------------------- | ------------------------------------------------------------------ |
| Add route          | `src/routes/<area>.py`      | Create router, export in `__init__.py`, include in `main.py`       |
| Add auth           | `src/auth.py`               | Use `require_clerk_auth` (user) or `require_ingest_auth` (service) |
| Add analytics      | `src/analytics.py`          | Use `capture()` with `distinct_id="api"`                           |
| Update rate limits | `src/ingest_ratelimit.py`   | Adjust `DEFAULT_BASE_SEC`, `DEFAULT_MAX_EXPONENT`                  |
| Export OpenAPI     | `scripts/export_openapi.py` | Run via `pnpm contracts:generate`                                  |

## CONVENTIONS

**Routing**

- One module per domain in `src/routes/`, export in `routes/__init__.py`
- Register in `src/main.py` with `app.include_router()`
  **Auth**
- `require_clerk_auth`: Bearer token, placeholder in dev, TODO: JWKS verify in prod
- `require_ingest_auth`: API key + per-IP exponential backoff via `InMemoryIngestBackoff`
- Constant-time comparison for keys (hmac.compare_digest)
  **Middleware**
- PostHog flush after every request (`@app.middleware("http")`)
- Global exception handler returns generic 500, logs stack server-side
  **Analytics**
- Server events use `distinct_id="api"`, no person profile by default
- Capture security events: `capture_ingest_auth_failure`, `capture_ingest_auth_blocked`
  **Rate Limiting**
- 429 + Retry-After header on blocked ingest attempts
- Exponential backoff: base_sec \* 2^fail_count, capped at 24h
  **OpenAPI**
- Pydantic models auto-generate schema
- Export: `python scripts/export_openapi.py` → `openapi.json`
- Consumed by `packages/contracts` for TypeScript generation
  **Python Stack**
- uv for deps, ruff for lint/format (line-length 88, py311)
- pytest in `tests/`, pythonpath includes `src`
- Run: `uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload`

## ANTI-PATTERNS

- Do not expose server secrets (CLERK_SECRET_KEY, INGEST_API_KEY, POSTHOG_API_KEY) to clients
- Do not log tokens or API keys (use secure logging with client_ip only)
- Do not return stack traces in HTTP responses (use generic 500 message)
- Do not edit `openapi.json` directly (regenerate from FastAPI)
- Do not skip constant-time comparison for secret keys (timing attacks)
