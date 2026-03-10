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

| Task               | Location                                            | Notes                                                                                                                                        |
| ------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Add route          | `src/routes/<area>.py`                              | Create router, export in `__init__.py`, include in `main.py`                                                                                 |
| Add auth           | `src/auth.py`                                       | Use `require_clerk_auth` (user) or `require_ingest_auth` (service)                                                                           |
| Add analytics      | `src/analytics.py`                                  | Use `capture()` with `distinct_id="api"`                                                                                                     |
| Update rate limits | `src/ingest_ratelimit.py`                           | Adjust `DEFAULT_BASE_SEC`, `DEFAULT_MAX_EXPONENT`                                                                                            |
| Export OpenAPI     | `scripts/export_openapi.py`                         | Run via `pnpm contracts:generate`                                                                                                            |
| Add/update env var | **Root** `.env.example` (and root `.env` for local) | API reads from root `.env` when run standalone or via root `pnpm dev:api`. See [.docs/guides/local-dev.md](../../.docs/guides/local-dev.md). |

## CONVENTIONS

**Routing**

- One module per domain in `src/routes/`, export in `routes/__init__.py`
- Register in `src/main.py` with `app.include_router()`
  **Auth**

- `require_clerk_auth`: Bearer token, placeholder in dev (accepts any Bearer if JWKS not configured), JWKS verify in prod (set `CLERK_JWT_ISSUER_DOMAIN` or `CLERK_JWKS_URL`)
- `require_ingest_auth`: API key + per-IP exponential backoff via `InMemoryIngestBackoff`. Dev: allows all if key unset. Prod: set `INGEST_API_KEY`
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
- Do not assume auth is production-ready without configuring JWKS (see Dev vs Production below)

## Dev vs Production

This scaffold includes dev-only behaviors that must be hardened for production:

| Component                    | Dev Placeholder                                             | Production Implementation                                                           |
| ---------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Clerk JWT verification       | Accepts any Bearer token if `CLERK_JWT_ISSUER_DOMAIN` unset | Configure `CLERK_JWT_ISSUER_DOMAIN` or `CLERK_JWKS_URL` for RS256 JWKS verification |
| Ingest API key               | Allows all requests if `INGEST_API_KEY` unset               | Set `INGEST_API_KEY`; uses constant-time comparison                                 |
| User deletion (`DELETE /me`) | Returns 200 stub                                            | Call Clerk Backend API with `CLERK_SECRET_KEY`; delete API-held user data           |
| PostHog analytics            | No-op if key unset or placeholder                           | Set `POSTHOG_API_KEY` for server-side event capture                                 |

**When adding auth to new routes:**

1. Use `require_clerk_auth` for user-facing routes
2. Document the placeholder behavior in route docstrings
3. Add production requirements to the table above
4. Update README.md Dev vs Production section

**Service boundaries:**

- FastAPI owns: heavy compute, webhooks, auth boundary (JWT verification), external integrations
- Convex owns: realtime UI state, collaborative data, reactive queries
- Scraper owns: data ingestion, feeds into FastAPI or Convex

See [FastAPI ↔ Convex](../../.docs/architecture/fastapi-convex-interaction.md) for cross-service patterns.
