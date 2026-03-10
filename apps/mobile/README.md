# Mobile (@korb/mobile)

Expo React Native app for Korb Guru — meal planning and shared shopping. Use this app as the iOS/Android client; it uses Expo Router, Clerk (auth), Convex (realtime), and PostHog (analytics).

- [Setup](#setup) · [Important commands](#important-commands) · [Project structure](#project-structure) · [Docs](#docs)

## Setup

1. **Install dependencies** — From repo root (recommended):

   ```bash
   pnpm install
   ```

2. **Set environment variables** — Copy from root or create `apps/mobile/.env`:

   ```env
   EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
   EXPO_PUBLIC_CONVEX_URL=<your-convex-dev-url>
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   EXPO_PUBLIC_POSTHOG_API_KEY=phc_...
   EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

   See root [.env.example](../../.env.example) and [Local Development](../../.docs/guides/local-dev.md). For Android emulator use `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000`.

3. **Convex** — Start Convex dev (e.g. `pnpm dev` from root or `pnpm --filter @korb/convex dev`) and set `EXPO_PUBLIC_CONVEX_URL` to your dev deployment URL.

## Important commands

Run from **repo root** with `pnpm --filter @korb/mobile <script>`, or from `apps/mobile` after setup.

| Command                                     | Description                                        |
| ------------------------------------------- | -------------------------------------------------- |
| `pnpm --filter @korb/mobile dev`            | Start Expo dev server (Metro).                     |
| `pnpm --filter @korb/mobile dev:ios`        | Start with iOS simulator.                          |
| `pnpm --filter @korb/mobile dev:android`    | Start with Android emulator.                       |
| `pnpm --filter @korb/mobile lint`           | Run ESLint.                                        |
| `pnpm --filter @korb/mobile typecheck`      | TypeScript check.                                  |
| `pnpm --filter @korb/mobile test`           | Run Vitest tests.                                  |
| `pnpm --filter @korb/mobile build`          | Export for iOS (or use build:android / build:ios). |
| `pnpm --filter @korb/mobile check`          | Lint + typecheck.                                  |
| `pnpm --filter @korb/mobile check:security` | Mobile security checks.                            |

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
