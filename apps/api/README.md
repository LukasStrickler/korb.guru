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

2. **Set environment variables** — Create `apps/api/.env` (or use root `.env`). Minimum for local dev:
   ```env
   # Optional: leave unset for dev placeholder auth
   CLERK_SECRET_KEY=sk_test_...
   # Optional: server-side PostHog
   POSTHOG_API_KEY=phc_...
   POSTHOG_HOST=https://app.posthog.com
   # CORS: comma-separated origins (e.g. http://localhost:8081,http://localhost:3000)
   CORS_ORIGINS=http://localhost:8081,http://localhost:3000
   ```
   See root [.env.example](../../.env.example). For DB-backed features later, set `DATABASE_URL`. CORS is configured from `CORS_ORIGINS`; when unset or empty, no origins are allowed.

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
| `src/auth.py`      | Clerk JWT auth boundary (placeholder in dev).                                            |
| `src/analytics.py` | PostHog server-side capture.                                                             |
| `scripts/`         | OpenAPI export for `packages/contracts`.                                                 |
| `tests/`           | Pytest tests.                                                                            |

## Docs

| Doc                                                                        | Description                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Local Development](../../.docs/guides/local-dev.md)                       | Port map.                                                         |
| [Contracts and codegen](../../.docs/guides/contracts.md)                   | When to run `pnpm contracts:generate`, CI drift, generated files. |
| [Auth Reference](../../.docs/reference/auth.md)                            | Protected routes, env.                                            |
| [FastAPI ↔ Convex](../../.docs/architecture/fastapi-convex-interaction.md) | When API calls Convex.                                            |
