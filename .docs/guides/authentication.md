# Authentication

**In this guide you will:** sign in and sign out from the mobile app, call protected Convex and FastAPI from the client, and add new protected endpoints or Convex functions. Auth in the Korb stack uses Clerk (sessions and JWT), Convex (JWT auto-attached), and FastAPI (Bearer token).

- [Overview](#overview) · [Mobile sign-in/sign-out](#mobile-sign-in-and-sign-out) · [Convex](#mobile-calling-convex-authenticated) · [FastAPI](#mobile-calling-fastapi-protected-endpoints) · [Handle and deep links](#handle-and-deep-links) · [Docs](#docs)

## Overview

| Layer       | Role                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------- |
| **Clerk**   | Sign-in/sign-up, session and JWT, secure storage on device.                              |
| **Convex**  | Receives Clerk JWT from the client; use `ctx.auth.getUserIdentity()` in functions.       |
| **FastAPI** | Receives `Authorization: Bearer <token>`; use `require_clerk_auth` for protected routes. |

```mermaid
sequenceDiagram
  participant User
  participant Mobile
  participant Clerk
  participant Convex
  participant FastAPI

  User->>Mobile: Sign in / Sign up
  Mobile->>Clerk: Authenticate
  Clerk->>Mobile: Session + JWT

  Note over Mobile,Convex: Convex (JWT auto-attached)
  Mobile->>Convex: Query/Mutation
  Convex->>Convex: ctx.auth.getUserIdentity()

  Note over Mobile,FastAPI: FastAPI (explicit token)
  Mobile->>Mobile: getToken()
  Mobile->>FastAPI: GET /me (Authorization: Bearer)
  FastAPI->>FastAPI: require_clerk_auth
```

## Mobile sign-in and sign-out

Expo Router route groups:

| Group    | Purpose                                                     |
| -------- | ----------------------------------------------------------- |
| `(auth)` | Sign-in and sign-up; shown when not signed in.              |
| `(home)` | Main app (handle, profile, sign-out); shown when signed in. |

Flow: (1) Root `index` redirects to `/(home)` if signed in, else `/(auth)/sign-in`. (2) Sign-in and sign-up use email + password (MFA supported). (3) After sign-in, the app syncs the Convex user via `users.syncFromClerk`; user can set a **handle** and sign out. (4) Sign-out uses `SignOutButton` → Clerk `signOut()` → redirect to sign-in.

## Mobile: calling Convex (authenticated)

Convex client uses `ConvexProviderWithClerk`; the client sends the Clerk JWT automatically. In Convex functions, require auth by checking `ctx.auth.getUserIdentity()` and throw if `null`:

```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
// identity.subject = Clerk user id
```

See `convex/users.ts` and `convex/example.ts` (`requireAuthExample`, `requireAuthMutationExample`). [Auth reference](../reference/auth.md#convex-authenticated-functions).

## Mobile: calling FastAPI (protected endpoints)

Send the Clerk session token in the header:

```http
Authorization: Bearer <clerk_session_token>
```

Get the token with `useAuth().getToken()` and call `fetchMe(token)` or `apiFetchWithAuth(path, token)` from `@/lib/api`. The helper adds the Bearer header. [Auth reference](../reference/auth.md#fastapi-protected-endpoints).

## Adding a protected FastAPI endpoint

1. Add a route with `Depends(require_clerk_auth)`.
2. Register the router in `main.py` and call it from the app via `apiFetchWithAuth(path, token)` with `getToken()`.

See [Auth reference](../reference/auth.md#fastapi-protected-endpoints) for production JWT verification.

## Adding an authenticated Convex function

1. In the handler, get identity with `ctx.auth.getUserIdentity()` and throw if `null`.
2. Use `identity.subject` as the stable Clerk user id (e.g. for the `users` table by `clerkId`).
3. See `convex/users.ts` and `convex/example.ts` for `requireAuthExample` and `requireAuthMutationExample`.

## Handle and deep links

Users set a **handle** (3–30 chars, alphanumeric + underscore) on the home screen. Stored in Convex; used for deep links (e.g. `korb.guru/add/<handle>`). Convex: `users.getByHandle`, `users.setHandle` (authenticated).

## Docs

| Doc                                    | Description                                            |
| -------------------------------------- | ------------------------------------------------------ |
| [Auth reference](../reference/auth.md) | Env vars, endpoints, Convex functions, production JWT. |
| [Local development](local-dev.md)      | Ports and env.                                         |
