# korb.guru

Meal planning and shared shopping for households. One app for recipes, meal plans, shopping, and cooking.

## Quick Start

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs all workspace dev processes (mobile, website, API, Convex, scraper, contracts). For API with Postgres and Qdrant: `pnpm db:ready` then see [Database setup](.docs/guides/database.md). [Local Development](.docs/guides/local-dev.md) has ports and env; [Authentication](.docs/guides/authentication.md) has sign-in setup.

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

See [FastAPI <-> Convex Interaction](.docs/architecture/fastapi-convex-interaction.md) for cross-service patterns.

## Tech Stack

- **Mobile**: Expo (React Native), TypeScript, Expo Router
- **Realtime Backend**: Convex (serverless TypeScript, reactive queries)
- **Compute Backend**: FastAPI (Python, async, heavy workloads)
- **Scraper**: Python with Click CLI, uv for package management
- **Monorepo**: pnpm workspaces + Turbo

## Common Commands

```bash
pnpm install
pnpm dev                         # full stack dev (mobile, website, api, convex, scraper)
pnpm --filter @korb/mobile dev   # single app
pnpm lint && pnpm typecheck && pnpm test
pnpm contracts:generate          # OpenAPI → TypeScript
pnpm build
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

## License

[Business Source License 1.1](LICENSE)

In plain English:

- You can read, fork, and modify the code.
- You can use the code for non-production purposes.
- Commercial production use is not allowed without a separate commercial license from the korb.guru team.
- Each released version transitions to AGPL-3.0-or-later four years after its first public release.
