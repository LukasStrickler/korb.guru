# Expo Monorepo + Convex + Clerk: Official Guide Comparison Report

**Historical report** (2026-03-09). One-off alignment check; actionable items (e.g. enable Clerk Native API) are in the [Deploy and rollback](../runbooks/deploy-and-rollback.md) runbook.

**Workspace:** `expo-monorepo-setup-koiu` · **Scope:** pnpm workspaces, `apps/mobile` (Expo SDK 55 + Convex + Clerk) vs official recommendations.

---

## 1. Sources Consulted

| Topic                     | URL                                             | Notes                                                                               |
| ------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Expo Monorepos**        | https://docs.expo.dev/guides/monorepos/         | pnpm, Metro, SDK 52+ auto config, isolated deps, SDK 55 autolinking in monorepos    |
| **Expo SDK 55**           | https://expo.dev/changelog/sdk-55               | React Native 0.83, React 19.2, New Architecture only                                |
| **Convex React Native**   | https://docs.convex.dev/quickstart/react-native | ConvexProvider, EXPO_PUBLIC_CONVEX_URL, convex/ folder                              |
| **Clerk Expo Quickstart** | https://clerk.com/docs/quickstarts/expo         | Native API, @clerk/clerk-expo (deprecated → @clerk/expo), tokenCache, ClerkProvider |
| **Expo + Clerk**          | https://docs.expo.dev/guides/using-clerk/       | Points to Clerk quickstart; expo-secure-store for tokens                            |

---

## 2. Repo Setup Summary

- **Monorepo:** pnpm workspaces (`pnpm-workspace.yaml`: `apps/*`, `packages/*`); Turbo for tasks.
- **Mobile app:** `apps/mobile` — **Expo SDK 55** (React 19.2, React Native 0.83.2), expo-router, Convex client, Clerk (`@clerk/clerk-expo`), `expo-secure-store`, NativeWind. New Architecture only (required by SDK 55).
- **Convex backend:** `apps/convex` — separate workspace with `convex/` (schema, auth.config.ts for Clerk, http.ts with Clerk webhook, users/recipes).
- **Provider order:** `ClerkProvider` → `ConvexClientProvider` (ConvexProviderWithClerk + useAuth) → Stack. Correct.
- **Env:** `.env.example` documents `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`, PostHog, API base URL. **Production:** `src/lib/env.ts` asserts required vars and rejects placeholders (called from root layout).

---

## 3. Alignment With Official Recommendations

### Expo monorepo

- **Workspace layout:** Matches docs: root `package.json`, `apps/*`, `packages/*`; pnpm uses `pnpm-workspace.yaml` (no root `workspaces` in package.json). ✓
- **Workspace deps:** Mobile uses `"@korb/contracts": "workspace:*"` (and config). Docs recommend `"workspace:*"` or `"*"`. ✓
- **SDK:** Expo 55. Docs: SDK 52+ automatic Metro for monorepos; SDK 55 enables `experiments.autolinkingModuleResolution` by default in monorepos. ✓
- **Metro:** Manual monorepo overrides removed; only NativeWind customization remains (per SDK 52+ guide). ✓

### Convex (React Native)

- **Client:** `convex` package, `ConvexReactClient(EXPO_PUBLIC_CONVEX_URL)`, provider wrapping app. ✓
- **Auth:** `ConvexProviderWithClerk` + `useAuth` from `@clerk/clerk-expo`; backend uses `ctx.auth.getUserIdentity()` and Clerk JWT in `auth.config.ts`. ✓
- **Backend location:** Convex quickstart assumes `convex/` next to the app. This repo uses `apps/convex`; mobile connects via `EXPO_PUBLIC_CONVEX_URL` to the same deployment. Valid monorepo pattern. ✓

### Clerk Expo

- **Package:** `@clerk/clerk-expo` (v2) — in use. Note: Clerk has deprecated this in favor of `@clerk/expo` (Core 3); consider migrating when ready (see upgrade guide).
- **Token storage:** Custom token cache using `expo-secure-store` (docs: use `expo-secure-store`; repo implements equivalent of `@clerk/expo/token-cache` with web-safe handling). ✓
- **Root layout:** `ClerkProvider` at root with `publishableKey` and `tokenCache`. ✓
- **Native:** Custom sign-in/sign-up with control components; docs state prebuilt UI is web-only. ✓

---

## 4. Deviations and Missing Steps for Production

### 4.1 Metro config (Expo monorepo) — FIXED

- **Docs:** From SDK 52, Expo configures Metro for monorepos automatically when using `expo/metro-config`. Remove `watchFolders`, `resolver.nodeModulesPaths`, `resolver.disableHierarchicalLookup`, `resolver.extraNodeModules`.
- **Repo:** Simplified: `apps/mobile/metro.config.js` now uses only `getDefaultConfig` + `withNativeWind`; no manual monorepo options. Run `npx expo start --clear` once after upgrade. ✓

### 4.2 Clerk Dashboard — Native API

- **Docs:** In Clerk Dashboard → Native applications, the Native API must be enabled for Expo/native apps.
- **Repo:** No code change; this is a one-time setup step.
- **Recommendation:** Document in README or runbook: "Enable Native API in Clerk Dashboard (Native applications) before using the mobile app."

### 4.3 Env / placeholder keys in code — FIXED

- **Clerk:** `src/lib/clerk.ts` still falls back to `pk_test_placeholder_key` in dev when `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is missing (with a console warning).
- **Convex:** `src/lib/convex.tsx` still falls back to `https://example.convex.cloud` in dev when `EXPO_PUBLIC_CONVEX_URL` is missing.
- **Production:** `src/lib/env.ts` implements `assertProductionEnv()`: in production builds (`!__DEV__`), it throws if either required var is missing or equals the placeholder. Root layout calls `assertProductionEnv()` at startup. ✓

### 4.4 Convex backend in `apps/convex`

- **Docs:** Convex quickstart uses a single app with `convex/` beside it. Here, Convex lives in `apps/convex` and mobile is in `apps/mobile`.
- **Repo:** Mobile uses `makeFunctionReference<...>("users:getCurrent")` (and similar) instead of importing from a Convex-generated `api` object. That avoids a build-time dependency from mobile to `apps/convex`'s `_generated`.
- **Recommendation:** No change required. If you want shared types and autocomplete, you could add a codegen step or a shared package that re-exports from `apps/convex/convex/_generated/api` and depend on it from mobile; optional.

### 4.5 pnpm isolated dependencies (Expo)

- **Docs:** From SDK 54, Expo supports isolated installs. SDK 55 enables `experiments.autolinkingModuleResolution` by default in monorepos.
- **Repo:** No root `.npmrc`. On SDK 55, default pnpm behavior is acceptable; if you see native/dependency issues, add root `.npmrc` with `node-linker=hoisted`.

### 4.6 Production readiness (from repo's own docs)

- **Clerk webhook** (`apps/convex/convex/http.ts`): AGENTS.md states that for production you should verify the Svix signature on Clerk webhook requests and implement user (and related data) deletion on `user.deleted`.
- **users.list** (`apps/convex/convex/users.ts`): Auth-required but returns all users; restrict or remove for production if not needed.
- **Recommendation:** Treat these as mandatory for production: implement webhook verification and narrow or remove `users.list` as appropriate.

---

## 5. Summary Table

| Area                              | Status           | Action                                             |
| --------------------------------- | ---------------- | -------------------------------------------------- |
| pnpm workspaces layout            | ✓ Aligned        | None                                               |
| Expo SDK                          | ✓ Upgraded       | SDK 55 (React 19.2, RN 0.83.2, New Arch only)      |
| ClerkProvider + tokenCache        | ✓ Aligned        | None; consider migrating to @clerk/expo later      |
| ConvexProviderWithClerk + useAuth | ✓ Aligned        | None                                               |
| Convex backend (apps/convex)      | ✓ Valid          | Optional: shared types/codegen                     |
| Metro monorepo config             | ✓ Fixed          | Simplified per SDK 52+ docs; NativeWind only       |
| Clerk Native API                  | ⚠ Doc step       | Document "Enable Native API" in README/runbook     |
| Env placeholders in prod          | ✓ Fixed          | assertProductionEnv() in root layout               |
| .npmrc (pnpm)                     | ○ Optional       | Add `node-linker=hoisted` only if issues on SDK 55 |
| Clerk webhook + users.list        | ⚠ Not prod-ready | Verify Svix; restrict/remove users.list            |

---

## 6. One-line checklist (production-ready scaffold)

- [ ] Enable Clerk "Native API" in Dashboard (documented).
- [x] Remove Metro monorepo overrides per Expo SDK 52+ guide (done; use `expo start --clear` once).
- [x] Env validation: require `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_CONVEX_URL` in production (no placeholders) — `src/lib/env.ts` + root layout.
- [ ] Convex: verify Clerk webhook with Svix; restrict or remove `users.list` for production.
- [ ] Optional: add root `.npmrc` with `node-linker=hoisted` if on SDK 55 and seeing native/dependency issues.
- [ ] Optional: migrate from `@clerk/clerk-expo` to `@clerk/expo` (Clerk Core 3) when ready; current package is deprecated.
