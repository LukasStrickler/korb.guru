# Clerk Expo + Convex Auth Downgrade Report

**Historical report** (2026-03-12). This documents why the mobile app is pinned to `@clerk/clerk-expo@2.19.31` and which integration surface is currently validated.

## Summary

The mobile app originally migrated to `@clerk/expo` (Core 3 line) while keeping Convex + Clerk auth. Clerk sign-in itself worked, and FastAPI auth with `getToken()` worked, but Convex auth did not. The app reached the home screen, Clerk reported the user as signed in, and Convex stayed unauthenticated.

The working resolution was:

- downgrade mobile auth back to `@clerk/clerk-expo@2.19.31`
- restore the documented `ConvexProviderWithClerk client={convex} useAuth={useAuth}` setup
- keep the app on one unified email-code screen for sign-in and sign-up
- complete auth with `useClerk().setActive({ session: createdSessionId })`

## Symptoms

- Clerk login succeeded on mobile.
- FastAPI protected endpoints worked with `getToken()`.
- Convex auth never established on the home screen.
- Attempts to debug `getToken({ template: "convex" })` showed inconsistent behavior across the newer Clerk Expo stack.
- The app accumulated temporary diagnostics and an API fallback token-mint route during incident handling.

## Root cause

The current repo did not have a validated Convex + Expo integration on the newer `@clerk/expo` line. Public Convex Expo references still matched the older `@clerk/clerk-expo` stack, and the runtime surface in this repo aligned more reliably with the older Clerk resource methods.

In practice, the migration risk was not Clerk sign-in itself. The unstable boundary was:

- Clerk Expo custom-flow resource methods
- Convex's expectation of the `convex` JWT template
- the runtime completion path for custom auth flows

## Decision

Pin the mobile app to the last known-good stack that is validated with Convex in this repo:

- package: `@clerk/clerk-expo@2.19.31`
- provider chain: `ClerkProvider` → `ConvexProviderWithClerk`
- auth flow: unified email-code sign-in/sign-up screen
- completion: `useClerk().setActive({ session: createdSessionId })`

Remove the temporary fallback and debugging paths once the downgrade is stable.

## Cleaned-up result

The repo no longer relies on the temporary incident-only code:

- removed mobile Convex token fallback helper
- removed FastAPI `POST /auth/convex-token`
- removed Convex/Clerk debug guide
- simplified the home auth gate back to actual Convex auth states

## Current working contract

### Mobile

- `apps/mobile/src/app/(auth)/index.tsx`
  One-screen email-code auth for sign-in and sign-up
- `apps/mobile/src/lib/clerk.ts`
  Clerk provider config and token cache
- `apps/mobile/src/lib/convex.tsx`
  Plain `ConvexProviderWithClerk client={convex} useAuth={useAuth}`

### Convex

- `apps/convex/convex/auth.config.ts`
  Clerk issuer domain must match the actual Clerk issuer
- Convex uses the `convex` JWT template

### FastAPI

- FastAPI uses the plain Clerk session token from `getToken()`
- FastAPI does not mint Convex tokens and does not depend on the Convex JWT template

## Revalidation checklist before any future Clerk migration

1. Confirm Convex publishes a working Expo reference for the target Clerk package line.
2. Revalidate direct Convex auth on device, not only Clerk sign-in.
3. Verify the unified email-code flow against the runtime type surface, not only docs snippets.
4. Keep `useClerk().setActive({ session: createdSessionId })` as the default completion path unless the new runtime is proven otherwise.
5. Remove any temporary diagnostics after the migration is stable.

## Sources consulted

- [Clerk Core 3 upgrade guide](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3)
- [Clerk Expo starter](https://github.com/clerk/clerk-expo-starter)
- [Clerk custom flow docs](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password)
- [Convex Clerk auth](https://docs.convex.dev/auth/clerk)
- [Convex Expo monorepo reference](https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo)
