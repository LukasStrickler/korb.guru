# Local development

**Audience:** Developers running the monorepo locally.  
**Doc type:** How-to (reference-heavy).

This guide explains dev scripts (**what** each command runs), Turbo/CI behavior, ports, and env. Naming matches intent: **`pnpm dev`** is the full stack; **`pnpm dev:app`** is the recommended app workflow (backend first, then interactive Expo).

Standards: [.agents/skills/docs-write/references/documentation-guide.md](../../.agents/skills/docs-write/references/documentation-guide.md).

- [Dev scripts (critical)](#dev-scripts-critical) · [Turbo behavior today](#turbo-behavior-today) · [CI today](#ci-today) · [Port map](#port-map) · [Local data services](#local-data-services-postgres--qdrant) · [Mobile env](#mobile-environment-variables) · [One service](#running-one-service-only) · [Pre-commit](#pre-commit-hygiene)

## Dev scripts (critical)

**Rule:** Name matches intent.

| Command                    | What it runs                                                                                                                                                                                          | When to use                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **`pnpm dev`**             | **Everything** — all workspaces that define `dev` (mobile Metro, website, API, Convex, scraper, contracts) + `db:ready` when Docker is up                                                             | Full monorepo; one command to spin the whole stack                    |
| **`pnpm dev:backend`**     | **Backend of the app only** — `db:ready` + **API + Convex** (foreground Turbo). No Metro                                                                                                              | When you want API/Convex without starting Expo                        |
| **`pnpm dev:app`**         | **Backend in background, then Expo in the foreground (interactive)** — one terminal: API + Convex start first; Metro runs last so you can use i/a / Shift+I / Shift+A. Ctrl+C stops Metro and backend | **Default daily flow** — no second terminal                           |
| **`pnpm dev:metro`**       | **Metro only** — same as `pnpm --filter @korb/mobile run dev`                                                                                                                                         | Backend already running elsewhere                                     |
| **`pnpm dev:all-but-app`** | All `dev` tasks **except** mobile (API, Convex, website, scraper, contracts) + `db:ready`                                                                                                             | Need website/scraper/contracts without Metro                          |
| **`pnpm dev:contracts`**   | **Contracts package only** — tsup watch on `@korb/contracts`                                                                                                                                          | Editing OpenAPI/codegen; optional if you only use generated artifacts |

```bash
pnpm install

# Option A — full monorepo (everything including website)
pnpm dev

# Option B — app workflow in one terminal (backend starts first, Expo last = interactive)
pnpm dev:app

# Metro only (backend already running)
pnpm dev:metro
```

**Do not confuse:**

- **`dev`** = all services (including website). Not “backend only.”
- **`dev:backend`** = API + Convex only (no Expo). Use when you don’t need the interactive Metro terminal.
- **`dev:app`** = backend then **interactive** Expo — not Metro-only; Metro-only is **`dev:metro`**.

Single-package runs: `pnpm dev:api`, `pnpm dev:convex`, `pnpm dev:website`, or `pnpm --filter @korb/<name> dev`.

## Turbo behavior today

Turbo is configured conservatively in this scaffold:

- **Local cache only**: `turbo.json` defines task outputs, but there is no remote cache wiring in the repo or CI. `TURBO_TOKEN` / `TURBO_TEAM` are not configured.
- **Persistent dev tasks**: `dev` is marked `persistent` and `cache: false`, so dev tasks always launch fresh long-running processes.
- **No affected-only execution**: Root scripts and GitHub Actions run broad commands such as `turbo run lint`, `turbo run test`, and `turbo run build`. No `--affected` flow is wired today.

Future improvements, not current behavior:

- **Remote Turbo cache** can speed up CI and branch-to-branch work once the team is ready to manage Turbo credentials and cache invalidation centrally.
- **Affected-only execution** is worth revisiting after the repo defines a stable base-ref strategy for pull requests and documents the tradeoff: faster feedback in exchange for more CI logic and a higher risk of hiding cross-workspace drift.

## CI today

GitHub Actions currently enforces these jobs:

- `install` — installs Node and Python toolchains, caches the pnpm store, caches root `node_modules`, and enables `uv` caching
- `lint` — runs `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm contracts:generate`, then fails if generated contracts drift from committed files
- `test` — runs `pnpm test` across the monorepo
- `mobile-build` — exports the Expo app for iOS and Android
- `python-lint-api` and `python-lint-scraper` — run Ruff lint and format checks in each Python app
- `api-health` — boots FastAPI locally in CI and curls `/health`

Important scope notes:

- The website participates in `pnpm test`, but its package still uses a placeholder `test` script. CI therefore does not provide real website test coverage yet.
- CI does not run a dedicated website build job today.
- CI uses GitHub Actions cache plus package-manager caching; it does not use Turbo remote cache.
- CI does not use affected-only execution; every run executes the configured repo-wide commands.

## Port map

| Service    | Port                     | URL                                                                          |
| ---------- | ------------------------ | ---------------------------------------------------------------------------- |
| FastAPI    | 8001                     | http://localhost:8001                                                        |
| Expo Metro | 8081                     | http://localhost:8081                                                        |
| Convex     | —                        | Set `EXPO_PUBLIC_CONVEX_URL` in mobile env.                                  |
| Postgres   | 5432                     | localhost (see [Local data services](#local-data-services-postgres--qdrant)) |
| Qdrant     | 6333 (REST), 6334 (gRPC) | http://localhost:6333, UI: http://localhost:6333/dashboard                   |

### Local data services (Postgres + Qdrant)

Stack is defined in root **`compose.yml`** (local only); config and seed live in `apps/postgres/` and `apps/qdrant/`. See [Database guide](database.md) for all commands and for **Coolify/production** (one-click Postgres + Qdrant, env vars on the API).

- **Use local:** `pnpm db:ready` (up + wait healthy + migrate; then optionally `pnpm db:seed`), or `pnpm db:up` then `pnpm db:migrate` and per-store seeds. The API needs `DATABASE_URL` and `QDRANT_URL` when using local DBs — set them to localhost in root `.env` (see `.env.example` and [Database guide](database.md)).
- **Use remote:** Point those vars at Coolify one-click or another host; do not run `pnpm db:up` for production DBs.

## Environment variables

### One place for local development (root `.env`)

You can use a **single root `.env`** so there is one place to define and manage variables for local dev:

1. Copy root `.env.example` to **root** `.env`: `cp .env.example .env`
2. Run dev from the repo root: `pnpm dev`, `pnpm dev:backend`, `pnpm dev:app`, etc.

Root scripts use **dotenv-cli**: they run `dotenv -- turbo run dev`, which loads the root `.env` and injects it into the environment for every app Turbo starts.

**Fallbacks when not using root scripts:**

- **API** — If you run the API from `apps/api` (e.g. `cd apps/api && uv run uvicorn ...`), the app loads root `.env` automatically via `python-dotenv` so the same file still works.
- **Mobile** — Metro is configured to load `.env` from the workspace root when you start from `apps/mobile`; if you run from root with `pnpm dev:app`, dotenv-cli already injects env.

Per-app `.env` files (e.g. `apps/mobile/.env`) are still supported: app-specific files can override or supplement the root file where tools support it.

### Deployment vs development

| Context        | Where config lives                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Local dev**  | One root `.env` (or per-app `.env`); loaded by dotenv-cli / app loaders. Never commit real secrets.                                                          |
| **Deployment** | Set by the deployment target: Vercel, Railway, Fly.io, Convex Dashboard, EAS, etc. No `.env` files in production; each app gets its own env in its platform. |

This follows [12-Factor config](https://12factor.net/config): one codebase, config in the environment, with different values per deploy (dev vs staging vs prod). Commit only `.env.example`; keep `.env` in `.gitignore`.

### Required for local development

These must be set before running the corresponding service:

| Variable                            | Service | How to obtain                                                     |
| ----------------------------------- | ------- | ----------------------------------------------------------------- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Mobile  | https://dashboard.clerk.com (pk*test*\* for dev)                  |
| `EXPO_PUBLIC_CONVEX_URL`            | Mobile  | Run `pnpm --filter @korb/convex dev` to get URL                   |
| `EXPO_PUBLIC_API_BASE_URL`          | Mobile  | `http://localhost:8001` (iOS) or `http://10.0.2.2:8001` (Android) |
| `CONVEX_DEPLOYMENT`                 | Convex  | Same as `EXPO_PUBLIC_CONVEX_URL` but without the client key       |

### Optional for local development

These have sensible defaults or are only needed for specific features:

| Variable           | Service     | Purpose                                              |
| ------------------ | ----------- | ---------------------------------------------------- |
| `CLERK_SECRET_KEY` | API         | Server-side Clerk operations (dev placeholder works) |
| `POSTHOG_API_KEY`  | Mobile/API  | Analytics (disabled if unset)                        |
| `INGEST_API_KEY`   | API/Scraper | Protects POST /ingest (dev allows all if unset)      |
| `CORS_ORIGINS`     | API         | Comma-separated allowed origins                      |

### Dev vs Production

**Development:** Many auth checks are bypassed when environment variables are unset. This lets you run locally without full credentials.

**Production:** Set these to harden auth:

- `CLERK_JWT_ISSUER_DOMAIN` (or `CLERK_JWKS_URL`) — enables JWT verification
- `INGEST_API_KEY` — protects the ingest endpoint
- `CORS_ORIGINS` — restricts to production origins

See [Auth reference](../reference/auth.md) for full details.

### Mobile environment example

```env
# iOS Simulator
EXPO_PUBLIC_API_BASE_URL=http://localhost:8001

# Android Emulator
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8001
```

## Mobile: check and security

From `apps/mobile`: `pnpm run check` (lint + typecheck), `pnpm run check:security` (no secrets, auth layouts). Run before committing.

## Running one service only

| Command              | Workspace         | Notes                                                            |
| -------------------- | ----------------- | ---------------------------------------------------------------- |
| `pnpm dev`           | all workspaces    | **Everything** — full stack.                                     |
| `pnpm dev:backend`   | api + convex + db | **Backend only** (foreground). No Expo.                          |
| `pnpm dev:app`       | script            | **Backend bg → Expo fg** — interactive Metro; Ctrl+C stops both. |
| `pnpm dev:metro`     | @korb/mobile      | **Metro only** — if API/Convex already running.                  |
| `pnpm dev:api`       | @korb/api         |                                                                  |
| `pnpm dev:convex`    | @korb/convex      |                                                                  |
| `pnpm dev:website`   | @korb/website     |                                                                  |
| `pnpm dev:contracts` | @korb/contracts   | Contracts watch only.                                            |

To run on different simulators or use development builds instead of Expo Go, see [Mobile: simulators and devices](mobile-simulators-and-devices.md).

Any workspace: `pnpm --filter @korb/api dev`, etc.

## Pre-commit hygiene

Husky installs on `pnpm install`. `lint-staged`: Prettier (Node), ESLint (mobile/packages/convex), Ruff (api/scraper). CI enforces repo-wide formatting, linting, typechecking, contract drift checks, monorepo tests, mobile export builds, Python lint/format checks, and an API health check. Skip: `git commit --no-verify`.

## See also

- [Authentication](authentication.md) · [Contracts and codegen](contracts.md) · [Auth reference](../reference/auth.md)
