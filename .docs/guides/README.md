# Guides

Guides are **how-to** and task-focused: they show you how to accomplish specific tasks (local setup, auth, testing, store compliance, and so on). For reference material (env vars, API details), see [reference/](../reference/). For architecture and decisions, see [architecture/](../architecture/) and [adr/](../adr/).

## All guides

| Doc                                                       | Description                                                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [Local development](local-dev.md)                         | Port map, env vars, `pnpm dev`, `dev:backend`, `dev:app`, `dev:ios`, `dev:android`, single service.      |
| [Database setup and migrations](database.md)              | Postgres (Alembic), Qdrant seed, db commands, schema workflow.                                           |
| [Authentication](authentication.md)                       | Sign-in/sign-up, Convex and FastAPI protected usage, deep links.                                         |
| [Analytics](analytics.md)                                 | PostHog: mobile bootstrap, FastAPI boundary, event ownership.                                            |
| [App Store compliance](app-store-compliance-checklist.md) | Bundle ID, privacy policy, EAS, permissions.                                                             |
| [Contracts and codegen](contracts.md)                     | When to run `pnpm contracts:generate`, CI drift, generated files.                                        |
| [Testing (mobile)](testing.md)                            | Unit, integration, component, E2E (Maestro), quarantine, coverage, mutation; includes flaky-test policy. |
| [Storybook (mobile)](storybook-mobile.md)                 | Visual + portable stories; one `*.stories.tsx` for UI and Jest.                                          |
| [Android emulator on Linux](android-emulator-linux.md)    | Install SDK/AVD on laptop or headless server; Storybook/E2E.                                             |

See the [main doc index](../README.md) for reference, architecture, ADRs, and runbooks.
