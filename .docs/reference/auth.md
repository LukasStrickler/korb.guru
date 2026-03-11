# Auth Reference

Env vars, API endpoints, Convex functions, and Clerk configuration for authentication.

- [Environment variables](#environment-variables) · [Clerk boundary](#clerk-integration-boundary) · [FastAPI](#fastapi-protected-endpoints) · [Convex](#convex-authenticated-functions) · [Mobile helpers](#mobile-api-helpers) · [Docs](#docs)

## Environment variables

### Mobile (`apps/mobile`)

| Variable                            | Required | Description                                                                                       |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes      | Clerk publishable key (`pk_test_*` / `pk_live_*`). [Clerk API keys](https://dashboard.clerk.com). |
| `EXPO_PUBLIC_CONVEX_URL`            | Yes      | Convex deployment URL.                                                                            |
| `EXPO_PUBLIC_API_BASE_URL`          | Yes      | FastAPI base URL (e.g. `http://localhost:8000` for iOS sim).                                      |

See [Local development](../guides/local-dev.md) for Android emulator.

### FastAPI (`apps/api`)

| Variable                      | When              | Description                                                                                                                                                          |
| ----------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLERK_JWT_ISSUER_DOMAIN`     | Production JWT    | Clerk Frontend API URL (e.g. `https://<instance>.clerk.accounts.dev`). JWKS is fetched from `{domain}/.well-known/jwks.json`; also used to validate JWT `iss` claim. |
| `CLERK_JWKS_URL`              | Optional override | Full JWKS URL if you don’t use `CLERK_JWT_ISSUER_DOMAIN`. Set `CLERK_JWT_ISSUER_DOMAIN` too for `iss` validation.                                                    |
| `CLERK_AZP_ALLOWED`           | Optional          | Comma-separated allowed `azp` (authorized party) values. If set, JWT is rejected unless `azp` is in this list.                                                       |
| `INGEST_API_KEY`              | Ingest auth       | When set, `POST /ingest` requires Bearer or `X-Ingest-Secret`. Scraper uses this or `--api-token`.                                                                   |
| `INGEST_BACKOFF_BASE_SEC`     | Optional          | Per-IP backoff base (default 60).                                                                                                                                    |
| `INGEST_BACKOFF_MAX_EXPONENT` | Optional          | Backoff exponent cap (default 10).                                                                                                                                   |
| `POSTHOG_API_KEY`             | Optional          | Server-side PostHog (security events).                                                                                                                               |
| `POSTHOG_HOST`                | Optional          | PostHog host (default `https://app.posthog.com`).                                                                                                                    |

### Convex (`apps/convex`)

Configure in [Convex Dashboard](https://dashboard.convex.dev) → Environment variables:

| Variable                  | When       | Description                                                            |
| ------------------------- | ---------- | ---------------------------------------------------------------------- |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk auth | Clerk Frontend API URL (e.g. `https://<instance>.clerk.accounts.dev`). |

Run `npx convex dev` after setting.

## Clerk integration boundary

| Concern        | Path                              | Notes                                                         |
| -------------- | --------------------------------- | ------------------------------------------------------------- |
| Clerk provider | `apps/mobile/src/app/_layout.tsx` | Chain: ClerkProvider → ConvexClientProvider → Stack.          |
| Token cache    | `apps/mobile/src/lib/clerk.ts`    | SecureStore-backed; `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` here. |
| Auth gate      | `apps/mobile/src/app/index.tsx`   | `useAuth()` → redirect to home or sign-in.                    |

Token handoff: mobile uses `getToken()` → `fetchMe(token)` or `apiFetchWithAuth(path, token)` → API reads `Authorization: Bearer` and uses `Depends(require_clerk_auth)`.

| Concern                               | Owner                                 |
| ------------------------------------- | ------------------------------------- |
| Identity, sign-in/up, session, tokens | Clerk                                 |
| API JWT verification                  | FastAPI (`require_clerk_auth`)        |
| Convex auth context                   | Convex (`ctx.auth.getUserIdentity()`) |

Do not duplicate: FastAPI does not run sign-in; Convex does not issue sessions; mobile does not verify JWTs.

## FastAPI protected endpoints

### `require_clerk_auth`

| Item     | Value                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Module   | `apps/api/src/auth.py`                                                                                                                                                                                                                                       |
| Usage    | `user: AuthUser = Depends(require_clerk_auth)`                                                                                                                                                                                                               |
| Behavior | Reads Bearer token; 401 if missing. When `CLERK_JWT_ISSUER_DOMAIN` or `CLERK_JWKS_URL` is set: verifies JWT with Clerk JWKS (RS256), validates `exp`/`nbf`/`iss`, optional `azp`; returns `AuthUser(user_id=sub, token_sub=sub)`. Otherwise dev placeholder. |

**Production:** Set `CLERK_JWT_ISSUER_DOMAIN` (Clerk Frontend API URL). Optionally set `CLERK_AZP_ALLOWED` (comma-separated) to validate `azp`. [Clerk: Validate session tokens](https://clerk.com/docs/request-authentication/validate-session-tokens).

### `require_ingest_auth`

| Item     | Value                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Usage    | `Depends(require_ingest_auth)` on `POST /ingest`.                                                                                 |
| Behavior | If `INGEST_API_KEY` set: require Bearer or `X-Ingest-Secret`. Else allow (dev). Constant-time compare; per-IP backoff on failure. |

### `GET /me` and `DELETE /me`

| Item       | Value                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File       | `apps/api/src/routes/me.py`                                                                                                                                                  |
| GET /me    | Auth: Bearer required. Response: `{ "user_id": string, "message": string }`. Mobile: `fetchMe(await getToken())` from `@/lib/api`.                                           |
| DELETE /me | Auth: Bearer required. Stub for now: returns `{ "ok": true }` and does not delete user yet. Implement Clerk Backend API deletion and cleanup before treating this as active. |

To add protected routes: use `Depends(require_clerk_auth)`, register router in `main.py`, call from app with `apiFetchWithAuth(path, token)`.

## Convex authenticated functions

Client sends Clerk JWT automatically with `ConvexProviderWithClerk`. In functions: `ctx.auth.getUserIdentity()`; throw if `null`.

### User functions (`convex/users.ts`)

| Function        | Type     | Auth     | Description                                        |
| --------------- | -------- | -------- | -------------------------------------------------- |
| `getCurrent`    | query    | Optional | Current user or null.                              |
| `syncFromClerk` | mutation | Required | Create/update user from Clerk. Call after sign-in. |
| `setHandle`     | mutation | Required | Set unique handle.                                 |
| `getByHandle`   | query    | Public   | User by handle (deep links).                       |
| `getByEmail`    | query    | Required | Look up by email.                                  |
| `list`          | query    | Required | List users.                                        |

Recipes (`convex/recipes.ts`): `create` requires auth and derives `userId` from identity.

### Placeholder examples (`convex/example.ts`)

| Function                     | Type     | Auth     | Description                                    |
| ---------------------------- | -------- | -------- | ---------------------------------------------- |
| `requireAuthExample`         | query    | Required | Returns `{ ok, subject, email }` or throws.    |
| `requireAuthMutationExample` | mutation | Required | Accepts `note`; template for authed mutations. |

## Mobile API helpers (`apps/mobile/src/lib/api.ts`)

| Helper                                   | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| `apiFetch(path, options)`                | Unauthenticated request.                 |
| `apiFetchWithAuth(path, token, options)` | Adds `Authorization: Bearer <token>`.    |
| `fetchHello()`                           | `GET /hello`.                            |
| `fetchMe(token)`                         | `GET /me`; pass token from `getToken()`. |

## Clerk Dashboard

1. **API Keys:** Publishable (mobile), Secret (FastAPI).
2. **Convex:** Enable Convex; set `CLERK_JWT_ISSUER_DOMAIN` to Clerk Frontend API URL.
3. **Sign-in:** Configure Google, Apple, email/password.
4. **JWT template (optional):** Custom claims for Convex/FastAPI via `getToken({ template: "..." })`.

## PostHog (API)

When you set `POSTHOG_API_KEY` (and it is not a placeholder), the API sends `ingest_auth_failure` and `ingest_auth_blocked` to PostHog (`distinct_id="api"`, no person profile). No-op when the key is unset.

## Docs

| Doc                                                               | Description         |
| ----------------------------------------------------------------- | ------------------- |
| [Authentication guide](../guides/authentication.md)               | Flows and usage.    |
| [Local development](../guides/local-dev.md)                       | Ports and env.      |
| [FastAPI ↔ Convex](../architecture/fastapi-convex-interaction.md) | Service boundaries. |
