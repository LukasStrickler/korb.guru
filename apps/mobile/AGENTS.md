# Mobile App

Expo React Native app with NativeWind, Clerk auth, Convex backend, and PostHog analytics.

## STRUCTURE

```
src/app/           # Expo Router screens (file-based routing)
src/components/      # Reusable UI components
src/lib/           # API client, Clerk, Convex, PostHog setup
src/hooks/         # Custom React hooks
src/types/         # TypeScript declarations
```

## WHERE TO LOOK

| Task                 | Location                                            | Notes                                                                                                      |
| -------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Add screen           | `src/app/(home)/` or `(auth)/`                      | File-based routing; groups organize navigation                                                             |
| Add deep link        | `src/app/go/[...slug].tsx`                          | Catch-all handler for `korbguru://` and `https://korb.guru/go/`                                            |
| Add component        | `src/components/`                                   | Use `accessible/` subfolder for a11y wrappers                                                              |
| Add API call         | `src/lib/api.ts`                                    | Use `apiFetchWithAuth()` for protected endpoints                                                           |
| Add analytics        | `src/lib/posthog.ts`                                | Use `trackEvent()` helper                                                                                  |
| Styling              | `global.css`                                        | Tailwind classes via NativeWind                                                                            |
| Add unit test        | `src/__tests__/**/*.unit.test.{ts,tsx}`             | Jest; do not put tests in `src/app/`                                                                       |
| Add integration test | `src/__tests__/**/*.integration.test.{ts,tsx}`      | Use `expo-router/testing-library` or MSW                                                                   |
| Run tests            | `pnpm test`, `pnpm test:unit`, `pnpm test:coverage` | See root [AGENTS.md](../../AGENTS.md) § TESTS and [.docs/guides/testing.md](../../.docs/guides/testing.md) |

## CONVENTIONS

**Navigation**

- Expo Router file-based routing with Stack navigator only
- Route groups: `(auth)/` for sign-in/sign-up, `(home)/` for authenticated screens
- Auth layouts redirect based on `useAuth()` state (see `(auth)/_layout.tsx`, `(home)/_layout.tsx`)
- Entry point: `package.json` `main` = `expo-router/entry` (not `index.ts`)

**Styling**

- NativeWind: Tailwind classes on React Native components (e.g., `className="flex-1 bg-white"`)
- Global styles imported in root `src/app/_layout.tsx`

**Auth**

- Clerk with token cache via `expo-secure-store` (see `src/lib/clerk.ts`)
- Protected routes use layout-level redirects, not route guards

**Backend**

- Convex reactive queries/mutations via `ConvexClientProvider` (see `src/lib/convex.tsx`)
- FastAPI calls via `src/lib/api.ts` with Clerk token auth

**Path Aliases**

- `@/*` maps to `./src/*` (configured in `tsconfig.json`, `babel.config.js`)

**Tests**

- Naming: `*.unit.test.*`, `*.integration.test.*`; flaky: `*.unit.flaky.test.*`, `*.integration.flaky.test.*`. Do not put test files inside `src/app/`. Use `expo-router/testing-library` (`renderRouter`, `screen`, `toHavePathname`) for router integration tests; use MSW in `src/test/integration-setup.ts` for API mocking if needed. Full command table: root AGENTS.md § TESTS and [.docs/guides/testing.md](../../.docs/guides/testing.md).

## ANTI-PATTERNS

- Do not create PostHog clients outside `src/lib/posthog.ts`
- Do not expose server-only secrets to mobile (use `EXPO_PUBLIC_*` prefix for client env vars only)
- Do not edit generated files: `expo-env.d.ts`, `.expo/types/router.d.ts`
- Do not use `pages/` directory (App Router only)
