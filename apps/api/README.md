# API (@korb/api)

FastAPI Python backend for Korb — heavy compute, integrations, webhooks, and the auth boundary (Clerk JWT). Use this app for the HTTP API; it runs on port **8000** and uses **uv** for Python dependencies.

- [Setup](#setup) · [Important commands](#important-commands) · [Endpoints](#endpoints) · [Project structure](#project-structure) · [Docs](#docs)

## Setup

1. **Install Python dependencies** — Requires Python ≥3.11. This monorepo uses **uv** for Python; `pnpm install` at repo root does not install API deps. From this app directory:

   ```bash
   cd apps/api
   uv sync
   ```

   Or from repo root: `uv sync --project apps/api`.

2. **Set environment variables** — Create `apps/api/.env` from root `.env.example`:

   ```bash
   cp ../../.env.example .env
   ```

   All API environment variables are optional for local development (dev placeholders work). Key variables:
   - `CLERK_SECRET_KEY` — Server-side Clerk operations (optional in dev)
   - `POSTHOG_API_KEY` — Server-side analytics (optional)
   - `CORS_ORIGINS` — Comma-separated allowed origins (e.g., `http://localhost:8081,http://localhost:3001`)
   - `INGEST_API_KEY` — Protects POST /ingest (dev allows all if unset)

   See [Local Development](../../.docs/guides/local-dev.md) and [Auth Reference](../../.docs/reference/auth.md) for full documentation.

## Dev vs Production Boundaries

This API is scaffolded for development. Some behaviors are placeholders that must be hardened for production:

| Feature            | Dev Behavior                                                | Production Requirement                                                        |
| ------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Clerk JWT auth** | Accepts any Bearer token if `CLERK_JWT_ISSUER_DOMAIN` unset | Set `CLERK_JWT_ISSUER_DOMAIN` or `CLERK_JWKS_URL` to enable JWKS verification |
| **Ingest API key** | Allows all requests if `INGEST_API_KEY` unset               | Set `INGEST_API_KEY` and use constant-time comparison                         |
| **User deletion**  | Returns 200 stub; no actual deletion                        | Call Clerk Backend API with `CLERK_SECRET_KEY`; delete API-held data          |
| **PostHog**        | No-op if key unset or placeholder                           | Set `POSTHOG_API_KEY` for server-side analytics                               |

**Service ownership reminder:** FastAPI handles heavy compute, webhooks, and the auth boundary. Realtime UI state lives in Convex. See [FastAPI ↔ Convex](../../.docs/architecture/fastapi-convex-interaction.md).

## Important commands

Run from **repo root** with `pnpm --filter @korb/api <script>`, or from `apps/api` after setup.

| Command                             | Description                                 |
| ----------------------------------- | ------------------------------------------- |
| `pnpm --filter @korb/api dev`       | Start FastAPI with hot reload on port 8000. |
| `pnpm --filter @korb/api lint`      | Run Ruff.                                   |
| `pnpm --filter @korb/api typecheck` | Python compile check.                       |
| `pnpm --filter @korb/api test`      | Run pytest.                                 |

From inside `apps/api`: use `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. Or run `uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload` (dev), `uv run ruff check src scripts` (lint), `uv run pytest` (test).

## Endpoints

| Method and path | Auth         | Description                                                        |
| --------------- | ------------ | ------------------------------------------------------------------ |
| GET /health     | No           | Health check.                                                      |
| GET /hello      | No           | Example JSON.                                                      |
| GET /me         | Bearer token | Current user (Clerk JWT).                                          |
| DELETE /me      | Bearer token | Account deletion (stub; production: delete via Clerk Backend API). |

When the server is running, open http://localhost:8000/docs for the full OpenAPI spec.

## Project structure

| Path               | Description                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `src/main.py`      | FastAPI app, CORS from `CORS_ORIGINS` env, middleware (request ID, access log, PostHog). |
| `src/routes/`      | Route modules (health, hello, me, ingest).                                               |
| `src/auth.py`      | Clerk JWT auth boundary (placeholder in dev, JWKS verify in prod).                       |
| `src/analytics.py` | PostHog server-side capture.                                                             |
| `scripts/`         | OpenAPI export for `packages/contracts`.                                                 |
| `tests/`           | Pytest tests.                                                                            |

## Docs

| Doc                                                                        | Description                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Local Development](../../.docs/guides/local-dev.md)                       | Port map.                                                         |
| [Contracts and codegen](../../.docs/guides/contracts.md)                   | When to run `pnpm contracts:generate`, CI drift, generated files. |
| [Auth Reference](../../.docs/reference/auth.md)                            | Protected routes, env, dev vs production setup.                   |
| [FastAPI ↔ Convex](../../.docs/architecture/fastapi-convex-interaction.md) | When API calls Convex.                                            |
