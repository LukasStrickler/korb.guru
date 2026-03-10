# korb.ing

Meal planning and shared shopping for households. App and deployments are under **korb.guru** (bundle id `guru.korb.mobile`, deep links `korb.guru/...`). From discovering recipes to planning meals, shopping, and cooking, all in one place.

## Quick Start

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the full stack: Expo mobile app, FastAPI backend, Convex realtime backend, scraper, and shared contracts watcher. See [Local Development](.docs/guides/local-dev.md) for ports, env vars, and troubleshooting.

## Project Structure

This is a pnpm + Turbo monorepo with a hybrid backend architecture. Each app has a **README** with setup and commands — see [apps/README.md](apps/README.md) for an index.

```
apps/
  mobile/             # Expo React Native mobile app (@korb/mobile)
  api/                # FastAPI Python backend (@korb/api)
  convex/             # Convex TypeScript backend (@korb/convex)
  scraper/            # Python scraper CLI (@korb/scraper)
packages/
  contracts/          # Shared TypeScript types (@korb/contracts)
  config/             # Shared tooling configs (@korb/config)
```

## Service Ownership

| Concern                                    | Owner   | Why                                          |
| ------------------------------------------ | ------- | -------------------------------------------- |
| Realtime collaborative state (UI updates)  | Convex  | Low-latency reactive queries                 |
| Client reads/writes that update UI live    | Convex  | Mobile consumes Convex directly              |
| Heavy compute, orchestration, integrations | FastAPI | Python ecosystem, async HTTP                 |
| Webhooks, scheduled jobs, ingestion        | FastAPI | Long-running tasks outside Convex            |
| Scraping and data ingestion                | Scraper | Separate Python CLI, feeds FastAPI or Convex |

See [FastAPI <-> Convex Interaction](.docs/architecture/fastapi-convex-interaction.md) for cross-service patterns.

## Tech Stack

- **Mobile**: Expo (React Native), TypeScript, Expo Router
- **Realtime Backend**: Convex (serverless TypeScript, reactive queries)
- **Compute Backend**: FastAPI (Python, async, heavy workloads)
- **Scraper**: Python with Click CLI, uv for package management
- **Monorepo**: pnpm workspaces + Turbo

## Common Commands

```bash
# Install dependencies
pnpm install

# Start full stack (all services)
pnpm dev

# Run one service only
pnpm --filter @korb/mobile dev
pnpm --filter @korb/api dev
pnpm --filter @korb/convex dev
pnpm --filter @korb/scraper dev

# Code quality
pnpm lint
pnpm typecheck
pnpm test
pnpm format
pnpm format:check

# Contract generation (FastAPI -> OpenAPI -> TypeScript)
pnpm contracts:generate

# Build and clean
pnpm build
pnpm clean
```

## Documentation

- [Local Development](.docs/guides/local-dev.md) — Ports, env vars, running mobile and API
- [FastAPI <-> Convex Interaction](.docs/architecture/fastapi-convex-interaction.md) — Service boundaries and directional patterns
- [Scraper Ingestion](.docs/architecture/scraper-ingestion.md) — Ingestion pipeline and Convex sync
- [Authentication](.docs/guides/authentication.md) — Sign-in/sign-up, protected routes
- [Auth Reference](.docs/reference/auth.md) — Env vars, auth patterns, mobile helpers

## Where to Place New Work

- **Mobile UI**: `apps/mobile/src/`
- **FastAPI routes**: `apps/api/src/routes/`
- **Convex functions**: `apps/convex/convex/`
- **Shared types**: `packages/contracts/src/types/`
- **Scraper logic**: `apps/scraper/src/`

When adding a feature that spans services, define one canonical owner per entity. See the architecture docs for decision guidance.
