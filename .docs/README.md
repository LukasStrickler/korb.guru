# Documentation

**Audience:** Developers working in the Korb monorepo.  
**Doc type:** Index (navigation).

**New to the repo?** Start with [Local development](guides/local-dev.md) and [Authentication](guides/authentication.md).

Standards: [.docs/DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md) and [.agents/skills/docs-write/references/documentation-guide.md](../.agents/skills/docs-write/references/documentation-guide.md).

- [Guides](#guides) · [Reference](#reference) · [Architecture](#architecture) · [ADRs](#adrs) · [Runbooks](#runbooks) · [Archive](#archive)

## Doc types (Divio)

| Type            | Location                                     |
| --------------- | -------------------------------------------- |
| **How-to**      | [guides/](guides/)                           |
| **Reference**   | [reference/](reference/)                     |
| **Explanation** | [architecture/](architecture/), [adr/](adr/) |
| **Runbook**     | [runbooks/](runbooks/)                       |

## Dev commands (canonical)

| Command                | Purpose                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **`pnpm dev`**         | Full stack — all workspaces + `db:ready`.                                                            |
| **`pnpm dev:app`**     | App dev: backend in background, then interactive Expo. See [Local development](guides/local-dev.md). |
| **`pnpm dev:metro`**   | Metro only.                                                                                          |
| **`pnpm dev:backend`** | API + Convex only (no Expo).                                                                         |

## Guides

| Doc                                                                       | Description                          |
| ------------------------------------------------------------------------- | ------------------------------------ |
| [Local development](guides/local-dev.md)                                  | Dev scripts, ports, env, CI.         |
| [Mobile: simulators and devices](guides/mobile-simulators-and-devices.md) | Expo Go, simulators, dev builds.     |
| [Database setup and migrations](guides/database.md)                       | Postgres, Qdrant, migrations.        |
| [Authentication](guides/authentication.md)                                | Sign-in, Convex/FastAPI, deep links. |
| [Analytics](guides/analytics.md)                                          | PostHog ownership and wiring.        |
| [App Store compliance](guides/app-store-compliance-checklist.md)          | Bundle ID, EAS, permissions.         |
| [Contracts and codegen](guides/contracts.md)                              | OpenAPI → TypeScript, CI drift.      |
| [Testing (mobile)](guides/testing.md)                                     | Jest, Maestro, quarantine.           |
| [Storybook (mobile)](guides/storybook-mobile.md)                          | Stories and Jest.                    |
| [Android emulator on Linux](guides/android-emulator-linux.md)             | SDK/AVD on Linux.                    |

## Reference

| Doc                                 | Description                             |
| ----------------------------------- | --------------------------------------- |
| [Auth reference](reference/auth.md) | Env vars, FastAPI/Convex auth patterns. |
| [API reference](reference/api.md)   | Base URL, OpenAPI, `@korb/contracts`.   |

## Architecture

| Doc                                                            | Description                    |
| -------------------------------------------------------------- | ------------------------------ |
| [FastAPI ↔ Convex](architecture/fastapi-convex-interaction.md) | Service boundaries.            |
| [Scraper ingestion](architecture/scraper-ingestion.md)         | Ingestion pipeline.            |
| [Production overview](architecture/production-overview.md)     | Env separation, service seams. |

## ADRs

Index: [adr/README.md](adr/README.md).

| Doc                                                                        | Description       |
| -------------------------------------------------------------------------- | ----------------- |
| [ADR 001: FastAPI and Convex coexistence](adr/001-fastapi-convex-split.md) | Why two backends. |

## Runbooks

| Doc                                                    | Description               |
| ------------------------------------------------------ | ------------------------- |
| [Deploy and rollback](runbooks/deploy-and-rollback.md) | Deploy order, rollback.   |
| [Incident response](runbooks/incident-response.md)     | Checks, logs, escalation. |

## Archive

Point-in-time reports: [archive/](archive/). Current procedures live in guides and runbooks.

| Doc                                                                                                 | Description                 |
| --------------------------------------------------------------------------------------------------- | --------------------------- |
| [Expo monorepo official comparison (2026-03)](archive/expo-monorepo-official-comparison-2026-03.md) | Historical alignment check. |
| [Clerk Expo downgrade report (2026-03)](archive/clerk-expo-convex-auth-downgrade-2026-03.md)        | Why mobile auth is pinned.  |
