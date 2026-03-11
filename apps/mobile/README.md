# Mobile (@korb/mobile)

Expo React Native app for Korb Guru — meal planning and shared shopping. Use this app as the iOS/Android client; it uses Expo Router, Clerk (auth), Convex (realtime), and PostHog (analytics).

- [Setup](#setup) · [Important commands](#important-commands) · [Project structure](#project-structure) · [Docs](#docs)

## Setup

1. **Install dependencies** — From repo root (recommended):

   ```bash
   pnpm install
   ```

2. **Set environment variables** — Create `apps/mobile/.env` from root `.env.example`:

   ```bash
   cp ../../.env.example .env
   ```

   Required variables:
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — from [Clerk dashboard](https://dashboard.clerk.com)
   - `EXPO_PUBLIC_CONVEX_URL` — from `pnpm --filter @korb/convex dev`
   - `EXPO_PUBLIC_API_BASE_URL` — `http://localhost:8000` (iOS) or `http://10.0.2.2:8000` (Android)

   See [Local Development](../../.docs/guides/local-dev.md) for full env documentation.

3. **Convex** — Start Convex dev (`pnpm --filter @korb/convex dev`) and copy the deployment URL to `EXPO_PUBLIC_CONVEX_URL`.

## Important commands

Run from **repo root** with `pnpm --filter @korb/mobile <script>`, or from `apps/mobile` after setup.

| Command                                        | Description                                        |
| ---------------------------------------------- | -------------------------------------------------- |
| `pnpm --filter @korb/mobile dev`               | Start Expo dev server (Metro).                     |
| `pnpm --filter @korb/mobile dev:ios`           | Start with iOS simulator.                          |
| `pnpm --filter @korb/mobile dev:android`       | Start with Android emulator.                       |
| `pnpm --filter @korb/mobile lint`              | Run ESLint.                                        |
| `pnpm --filter @korb/mobile typecheck`         | TypeScript check.                                  |
| `pnpm --filter @korb/mobile test`              | Run Jest tests (unit + integration).               |
| `pnpm --filter @korb/mobile build`             | Export for iOS (or use build:android / build:ios). |
| `pnpm --filter @korb/mobile check`             | Lint + typecheck.                                  |
| `pnpm --filter @korb/mobile check:security`    | Security checks (secrets, auth layouts).           |
| `pnpm --filter @korb/mobile test:unit`         | Unit tests only.                                   |
| `pnpm --filter @korb/mobile test:integration`  | Integration tests only.                            |
| `pnpm --filter @korb/mobile test:component`    | Component tests only.                              |
| `pnpm --filter @korb/mobile test:watch`        | Watch mode (all tests).                            |
| `pnpm --filter @korb/mobile test:coverage`     | Coverage report.                                   |
| `pnpm --filter @korb/mobile test:quarantine`   | Quarantined (flaky) tests.                         |
| `pnpm --filter @korb/mobile test:mutation`     | Mutation testing (Stryker).                        |
| `pnpm --filter @korb/mobile test:e2e`          | E2E tests (Maestro).                               |
| `pnpm --filter @korb/mobile storybook`         | Start Storybook dev server.                        |
| `pnpm --filter @korb/mobile storybook:ios`     | Storybook with iOS simulator.                      |
| `pnpm --filter @korb/mobile storybook:android` | Storybook with Android emulator.                   |
| `pnpm --filter @korb/mobile clean`             | Clean build artifacts and deps.                    |

From inside `apps/mobile`: use `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (same script names).

## Project structure

| Path              | Description                                      |
| ----------------- | ------------------------------------------------ |
| `src/app/`        | Expo Router screens (file-based routing).        |
| `src/components/` | Reusable UI.                                     |
| `src/lib/`        | API client, Clerk helpers, Convex/PostHog setup. |
| `app.json`        | Expo config (name, slug, bundle id, plugins).    |

## Docs

| Doc                                                    | Description                        |
| ------------------------------------------------------ | ---------------------------------- |
| [Local Development](../../.docs/guides/local-dev.md)   | Ports, env, device URLs.           |
| [Authentication](../../.docs/guides/authentication.md) | Sign-in/sign-up, protected routes. |
| [Auth Reference](../../.docs/reference/auth.md)        | Env vars and patterns.             |
