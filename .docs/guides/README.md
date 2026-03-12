# Guides

**Audience:** Developers running or extending the monorepo.  
**Doc type:** How-to (task-focused).

Guides show how to accomplish specific tasks: local setup, auth, testing, store compliance, and so on. For facts (env vars, API details), see [reference/](../reference/). For architecture and decisions, see [architecture/](../architecture/) and [adr/](../adr/).

Writing standards follow [.agents/skills/docs-write/references/documentation-guide.md](../../.agents/skills/docs-write/references/documentation-guide.md) (style, structure, Divio types).

## Dev commands (canonical)

Use this table when linking or summarizing; full detail is in [Local development](local-dev.md).

| Command                | Purpose                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **`pnpm dev`**         | Full stack — all workspaces with a `dev` script + `db:ready`.                                                                               |
| **`pnpm dev:app`**     | **App development (recommended):** API + Convex in background, then **interactive** Expo in foreground (`scripts/dev-backend-then-app.sh`). |
| **`pnpm dev:metro`**   | Metro only — use when API/Convex already run.                                                                                               |
| **`pnpm dev:backend`** | API + Convex only (foreground) — no Expo.                                                                                                   |

## All guides

| Doc                                                                | Description                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| [Local development](local-dev.md)                                  | Dev scripts, ports, env, Turbo/CI scope.               |
| [Mobile: simulators and devices](mobile-simulators-and-devices.md) | Expo Go, picking simulators/emulators, dev builds.     |
| [Database setup and migrations](database.md)                       | Postgres (Alembic), Qdrant seed, db commands.          |
| [Authentication](authentication.md)                                | Sign-in/sign-up, Convex and FastAPI usage, deep links. |
| [Analytics](analytics.md)                                          | PostHog: mobile bootstrap, FastAPI boundary.           |
| [App Store compliance](app-store-compliance-checklist.md)          | Bundle ID, privacy policy, EAS, permissions.           |
| [Contracts and codegen](contracts.md)                              | `pnpm contracts:generate`, CI drift, generated files.  |
| [Testing (mobile)](testing.md)                                     | Jest, Maestro, quarantine, coverage, mutation.         |
| [Storybook (mobile)](storybook-mobile.md)                          | Portable stories and Jest.                             |
| [Android emulator on Linux](android-emulator-linux.md)             | SDK/AVD on Linux; Storybook/E2E.                       |

See the [main doc index](../README.md) for reference, architecture, ADRs, and runbooks.
