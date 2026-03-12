# Documentation

Index of all docs in `.docs/`. Audience: developers in the Korb monorepo.

**New to the repo?** Start with [Local development](guides/local-dev.md) and [Authentication](guides/authentication.md).

- [Guides](#guides) · [Reference](#reference) · [Architecture](#architecture) · [ADRs](#adrs) · [Runbooks](#runbooks) · [Archive](#archive)

## Doc types (Divio)

| Type            | Location                                     |
| --------------- | -------------------------------------------- |
| **How-to**      | [guides/](guides/)                           |
| **Reference**   | [reference/](reference/)                     |
| **Explanation** | [architecture/](architecture/), [adr/](adr/) |
| **Runbook**     | [runbooks/](runbooks/)                       |

## Guides

| Doc                                                                       | Description                                                                                              |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [Local development](guides/local-dev.md)                                  | Port map, env vars, `pnpm dev`, `dev:backend`, `dev:app`, `dev:ios`, `dev:android`, single service.      |
| [Mobile: simulators and devices](guides/mobile-simulators-and-devices.md) | iOS/Android simulators, Expo Go vs development builds, picking devices.                                  |
| [Database setup and migrations](guides/database.md)                       | Postgres (Alembic), Qdrant seed, db commands, schema workflow.                                           |
| [Authentication](guides/authentication.md)                                | Sign-in/sign-up, Convex and FastAPI protected usage, deep links.                                         |
| [Analytics](guides/analytics.md)                                          | PostHog: mobile bootstrap, FastAPI boundary, event ownership.                                            |
| [App Store compliance](guides/app-store-compliance-checklist.md)          | Bundle ID, privacy policy, EAS, permissions.                                                             |
| [Contracts and codegen](guides/contracts.md)                              | When to run `pnpm contracts:generate`, CI drift, generated files.                                        |
| [Testing (mobile)](guides/testing.md)                                     | Unit, integration, component, E2E (Maestro), quarantine, coverage, mutation; includes flaky-test policy. |
| [Storybook (mobile)](guides/storybook-mobile.md)                          | Visual + portable stories; one `*.stories.tsx` for UI and Jest.                                          |
| [Android emulator on Linux](guides/android-emulator-linux.md)             | Install SDK/AVD on laptop or headless server; Storybook/E2E.                                             |

## Reference

| Doc                                 | Description                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| [Auth reference](reference/auth.md) | Env vars, FastAPI/Convex auth patterns, mobile API helpers.                       |
| [API reference](reference/api.md)   | Base URL, OpenAPI at `/docs`, route groups, generated types in `@korb/contracts`. |

## Architecture

| Doc                                                            | Description                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [FastAPI ↔ Convex](architecture/fastapi-convex-interaction.md) | Service boundaries and directional patterns.                                                                                                            |
| [Scraper ingestion](architecture/scraper-ingestion.md)         | Ingestion pipeline and Convex sync.                                                                                                                     |
| [Production overview](architecture/production-overview.md)     | korb.guru traceability, env separation, service seams. Before-production checks and gaps are in [Deploy and rollback](runbooks/deploy-and-rollback.md). |

## ADRs

Index in [adr/README.md](adr/README.md).

| Doc                                                                        | Description              |
| -------------------------------------------------------------------------- | ------------------------ |
| [ADR 001: FastAPI and Convex coexistence](adr/001-fastapi-convex-split.md) | Why we run two backends. |

## Runbooks

| Doc                                                    | Description                                             |
| ------------------------------------------------------ | ------------------------------------------------------- |
| [Deploy and rollback](runbooks/deploy-and-rollback.md) | Deploy order (Convex → API → mobile), rollback, config. |
| [Incident response](runbooks/incident-response.md)     | Convex/FastAPI/mobile checks, logs, escalation.         |

## Archive

Point-in-time and historical reports live in [archive/](archive/). Current procedures are in runbooks and guides.

| Doc                                                                                                 | Description                                                                                                                           |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [Expo monorepo official comparison (2026-03)](archive/expo-monorepo-official-comparison-2026-03.md) | Historical alignment check vs Expo/Convex/Clerk docs; actionable items are in [Deploy and rollback](runbooks/deploy-and-rollback.md). |
| [Clerk Expo downgrade report (2026-03)](archive/clerk-expo-convex-auth-downgrade-2026-03.md)        | Why mobile auth is pinned to `@clerk/clerk-expo@2.19.31`, what failed on the newer stack, and the validated replacement contract.     |
