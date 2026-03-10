# Apps

Overview of the four runnable applications in the Korb monorepo. Use this index to find setup and commands for each app; each subdirectory has its own **README** with getting-started steps and important commands.

**Audience:** Developers working in the monorepo or running a single app.

- [Overview](#overview) · [Running everything](#running-everything) · [Running one app](#running-one-app) · [Per-app READMEs](#per-app-readmes) · [Service ownership](#service-ownership) · [Docs](#docs)

## Overview

| App                       | Tech                            | Purpose                                                                                           |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| **[mobile](./mobile/)**   | Expo (React Native), TypeScript | iOS/Android app — meal planning, shopping, auth (Clerk), realtime (Convex), analytics (PostHog).  |
| **[api](./api/)**         | FastAPI, Python (uv)            | HTTP API — heavy compute, integrations, webhooks, auth boundary (Clerk JWT), server-side PostHog. |
| **[convex](./convex/)**   | Convex, TypeScript              | Realtime backend — collaborative state, reactive queries/mutations, Convex auth (Clerk).          |
| **[scraper](./scraper/)** | Python (uv), Click CLI          | Ingestion CLI — mock/scrape data, output to stdout or ingest endpoint.                            |

## Running everything

From the **repo root**:

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts mobile (Expo), API (port 8000), Convex dev, scraper dev, and the contracts watcher. See [Local Development](../.docs/guides/local-dev.md) for ports and env vars.

## Running one app

From repo root (recommended):

```bash
pnpm --filter @korb/mobile dev
pnpm --filter @korb/api dev
pnpm --filter @korb/convex dev
pnpm --filter @korb/scraper dev
```

Or `cd` into the app and run the commands in its README (e.g. `pnpm dev` in mobile, `uv run …` in api/scraper).

## Per-app READMEs

| App     | README                                   | Contents                             |
| ------- | ---------------------------------------- | ------------------------------------ |
| Mobile  | [mobile/README.md](./mobile/README.md)   | Expo app, env, iOS/Android, EAS      |
| API     | [api/README.md](./api/README.md)         | FastAPI, uv, routes, auth, health    |
| Convex  | [convex/README.md](./convex/README.md)   | Convex dev/deploy, schema, functions |
| Scraper | [scraper/README.md](./scraper/README.md) | CLI, mock mode, ingestion            |

See the [root README](../README.md) for project overview, quick start, and service ownership.

## Service ownership

- **Convex** — Realtime UI state, collaborative data; mobile talks to Convex directly.
- **FastAPI** — Heavy logic, external APIs, webhooks; mobile and Convex can call it.
- **Scraper** — Data ingestion; outputs to file or POST to API/Convex as needed.

See [FastAPI ↔ Convex](../.docs/architecture/fastapi-convex-interaction.md) for boundaries.

## Docs

- [Local Development](../.docs/guides/local-dev.md) — Ports, env, and what `pnpm dev` starts
- [Root README](../README.md) — Project overview, quick start, and tech stack
