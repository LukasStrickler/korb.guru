# korb.guru

Meal planning and shared shopping for households. One app for recipes, meal plans, shopping, and cooking.

**Docs index:** [.docs/README.md](.docs/README.md) · **Local dev (how-to):** [.docs/guides/local-dev.md](.docs/guides/local-dev.md)

## App development (mobile)

Use **one command** — backend starts in the background, then Metro runs **last** in the same terminal so it stays **interactive** (choose iOS/Android with `i` / `a` or Shift+I / Shift+A):

```bash
pnpm install
pnpm dev:app
```

- **`pnpm dev:app`** — `db:ready` (if Docker is up) → API + Convex in the background → **Expo in the foreground**. Ctrl+C stops Metro and the backend.
- **`pnpm dev:metro`** — Metro only; use when API/Convex are already running (e.g. after `pnpm dev:backend`).
- From **`apps/mobile`**, `pnpm dev` is Metro only (same as `dev:metro` from root).

Full stack (website, scraper, contracts watch, etc.): **`pnpm dev`**. See [Local Development](.docs/guides/local-dev.md).

## Quick Start (full monorepo)

```bash
pnpm install
pnpm dev
```

**`pnpm dev`** runs every workspace dev process + `db:ready`. For app work, prefer **`pnpm dev:app`** above. [Database setup](.docs/guides/database.md) · [Authentication](.docs/guides/authentication.md).

## Structure

pnpm + Turbo monorepo. App READMEs and index: [apps/README.md](apps/README.md).

```
apps/
  mobile/      Expo React Native (@korb/mobile)
  website/     Next.js marketing (@korb/website)
  api/         FastAPI Python (@korb/api)
  convex/      Convex TypeScript (@korb/convex)
  scraper/     Python scraper CLI (@korb/scraper)
packages/
  contracts/   Shared TS types from OpenAPI (@korb/contracts)
  config/      Shared tooling (@korb/config)
```

## Service Ownership

| Concern                                    | Owner   | Why                                              |
| ------------------------------------------ | ------- | ------------------------------------------------ |
| Realtime collaborative state (UI updates)  | Convex  | Low-latency reactive queries                     |
| Client reads/writes that update UI live    | Convex  | Mobile consumes Convex directly                  |
| Heavy compute, orchestration, integrations | FastAPI | Python ecosystem, async HTTP                     |
| Webhooks, scheduled jobs, ingestion API    | FastAPI | Long-running backend flows and ingest entrypoint |
| Scraping and ingestion payload generation  | Scraper | Separate Python CLI, feeds FastAPI or Convex     |

See [FastAPI ↔ Convex](.docs/architecture/fastapi-convex-interaction.md) for cross-service patterns.

## Tech Stack

- **Mobile**: Expo (React Native), TypeScript, Expo Router
- **Realtime Backend**: Convex (serverless TypeScript, reactive queries)
- **Compute Backend**: FastAPI (Python, async, heavy workloads)
- **Scraper**: Python with Click CLI, uv for package management
- **Monorepo**: pnpm workspaces + Turbo

## Common Commands

```bash
pnpm install
# App development (recommended)
pnpm dev:app              # backend bg → interactive Expo (one terminal)
pnpm dev:metro            # Metro only (backend already up)
pnpm dev:backend          # API + Convex only (no Expo)

# Full / other
pnpm dev                  # entire monorepo + db:ready
pnpm dev:full             # alias for pnpm dev
pnpm dev:all-but-app      # all except mobile
pnpm dev:contracts        # contracts watcher only

# Single services
pnpm dev:api
pnpm dev:convex
pnpm dev:website

pnpm lint && pnpm typecheck && pnpm test
pnpm contracts:generate   # OpenAPI → TypeScript
pnpm build
```

## Documentation

- [Local Development](.docs/guides/local-dev.md) — Ports, env vars, dev scripts
- [FastAPI ↔ Convex](.docs/architecture/fastapi-convex-interaction.md) — Service boundaries and directional patterns
- [Scraper ingestion](.docs/architecture/scraper-ingestion.md) — Ingestion pipeline and Convex sync
- [Authentication](.docs/guides/authentication.md) — Sign-in/sign-up, protected routes
- [Auth Reference](.docs/reference/auth.md) — Env vars, auth patterns, mobile helpers

## Where to Place New Work

- **Mobile UI**: `apps/mobile/src/`
- **FastAPI routes**: `apps/api/src/routes/`
- **Convex functions**: `apps/convex/convex/`
- **Shared types**: `packages/contracts/src/types/`
- **Scraper logic**: `apps/scraper/src/`

When adding a feature that spans services, define one canonical owner per entity. See the architecture docs for decision guidance.

## Hackathon Challenges

This project targets two challenges at the GenAI Zurich Hackathon 2026:

- **Apify Challenge** — Live web data scraping with custom Actors. See [docs/actors.md](docs/actors.md)
- **Qdrant Challenge** — Context Engineering for Agentic RAG. See [docs/qdrant.md](docs/qdrant.md)

## License

[Business Source License 1.1](LICENSE)

In plain English:

- You can read, fork, and modify the code.
- You can use the code for non-production purposes.
- Commercial production use is not allowed without a separate commercial license from the korb.guru team.
- Each released version transitions to AGPL-3.0-or-later four years after its first public release.
