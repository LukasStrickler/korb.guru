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

| Task                 | Location                                                                                            | Notes                                                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add screen           | `src/app/(home)/` or `(auth)/`                                                                      | File-based routing; groups organize navigation                                                                                                                                                             |
| Add deep link        | `src/app/go/[...slug].tsx`                                                                          | Catch-all handler for `korbguru://` and `https://korb.guru/go/`                                                                                                                                            |
| Add component        | `src/components/`                                                                                   | Use `accessible/` subfolder for a11y wrappers                                                                                                                                                              |
| Add API call         | `src/lib/api.ts`                                                                                    | Use `apiFetchWithAuth()` for protected endpoints                                                                                                                                                           |
| Add analytics        | `src/lib/posthog.ts`                                                                                | Use `trackEvent()` helper                                                                                                                                                                                  |
| Styling              | `global.css`                                                                                        | Tailwind classes via NativeWind                                                                                                                                                                            |
| Add unit test        | `src/__tests__/**/*.unit.test.{ts,tsx}`                                                             | Jest; do not put tests in `src/app/`                                                                                                                                                                       |
| Add integration test | `src/__tests__/**/*.integration.test.{ts,tsx}`                                                      | Use `expo-router/testing-library`; keep tests out of `src/app/`                                                                                                                                            |
| Run tests            | `pnpm test`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:component`, `pnpm test:coverage` | See root [AGENTS.md](../../AGENTS.md) § TESTS and [.docs/guides/testing.md](../../.docs/guides/testing.md)                                                                                                 |
| Add/update env var   | **Root** `.env.example` (and root `.env` for local)                                                 | Mobile uses `EXPO_PUBLIC_*` from root when running via `pnpm dev` / `pnpm dev:app` / `pnpm dev:ios` / `pnpm dev:android` from repo root. See [.docs/guides/local-dev.md](../../.docs/guides/local-dev.md). |

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
- Current validated package is `@clerk/clerk-expo@2.19.31`
- Unified auth screen lives at `src/app/(auth)/index.tsx`
- Completion path for custom flows is `useClerk().setActive({ session: createdSessionId })`
- On the pinned stack, sign-in email verification uses `signIn.create({ identifier })`, `prepareFirstFactor({ strategy: "email_code", emailAddressId })`, and `attemptFirstFactor({ strategy: "email_code", code })`
- On the pinned stack, sign-up email verification uses `prepareEmailAddressVerification()` and `attemptEmailAddressVerification()`
- Protected routes use layout-level redirects, not route guards

**Backend**

- Convex reactive queries/mutations via `ConvexClientProvider` (see `src/lib/convex.tsx`)
- FastAPI calls via `src/lib/api.ts` with Clerk token auth

**Path Aliases**

- `@/*` maps to `./src/*` (configured in `tsconfig.json`, `babel.config.js`)

**Tests**

- Naming: `*.unit.test.*`, `*.component.test.*`, `*.integration.test.*`; flaky: `*.unit.flaky.test.*`, `*.integration.flaky.test.*`. Do not put test files inside `src/app/`. Use `expo-router/testing-library` (`renderRouter`, `screen`, `toHavePathname`) for router integration tests. Full command table: root AGENTS.md § TESTS and [.docs/guides/testing.md](../../.docs/guides/testing.md).

## ANTI-PATTERNS

- Do not create PostHog clients outside `src/lib/posthog.ts`
- Do not expose server-only secrets to mobile (use `EXPO_PUBLIC_*` prefix for client env vars only)
- Do not edit generated files: `expo-env.d.ts`, `.expo/types/router.d.ts`
- Do not use `pages/` directory (App Router only)
- Do not upgrade Clerk Expo packages or swap auth methods without revalidating Convex auth on device. See [Auth reference](../../.docs/reference/auth.md) and [Clerk downgrade report](../../.docs/archive/clerk-expo-convex-auth-downgrade-2026-03.md).
