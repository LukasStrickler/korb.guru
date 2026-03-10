# Deploy and Rollback

Runbook for deployment order, rollback steps, and where configuration lives. Use when releasing Convex, FastAPI, or the mobile app.

- [Before production](#before-production) · [Deploy order](#deploy-order) · [Rollback](#rollback) · [Where config lives](#where-config-lives) · [Contacts](#contacts) · [Docs](#docs)

## Before production

**One-time:** Enable **Native API** in [Clerk Dashboard](https://dashboard.clerk.com) → Native applications (required for Expo/native apps).

**Env and auth:** Set `CLERK_JWT_ISSUER_DOMAIN` (or `CLERK_JWKS_URL`) and `INGEST_API_KEY` so dev auth bypasses are off. Set `CORS_ORIGINS` to production origins only (e.g. `https://korb.guru`, `https://api.korb.guru`). See [Auth reference](../reference/auth.md).

**Checklist:** Staging/prod keys; CORS to target domains; Convex prod deployment; FastAPI health and graceful shutdown; request logging with PII filtering; rate limits; rollback procedure. **Convex:** Verify Svix signature on Clerk webhooks (`apps/convex/convex/http.ts`); implement user cleanup on `user.deleted`. Restrict or remove `users.list` for production (`apps/convex/convex/users.ts`). **Deep links:** Deploy website with real `.well-known` (Team ID, SHA256) and rebuild mobile.

**Gaps to close before production:**

| Gap                      | Location                      | Action                                                                                                                                     |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **DELETE /me**           | `apps/api/src/routes/me.py`   | Call Clerk Backend API to delete user; remove API-held user data. See [App Store compliance](../guides/app-store-compliance-checklist.md). |
| **Convex Clerk webhook** | `apps/convex/convex/http.ts`  | Verify Svix; implement user cleanup on `user.deleted`.                                                                                     |
| **Convex users.list**    | `apps/convex/convex/users.ts` | Restrict or remove for production.                                                                                                         |
| **Placeholder content**  | Website, app copy             | Replace before store review. See App Store compliance.                                                                                     |
| **EAS / store config**   | `eas.json`, `.well-known`     | Replace placeholders; add Android service account key. See App Store compliance.                                                           |

For store and app compliance (bundle ID, privacy, EAS, permissions), see [App Store compliance](../guides/app-store-compliance-checklist.md).

**Pre-launch checklist (this repo):** Mark items as you complete them.

- **Backend and app:** Implement Clerk user deletion in `delete_me` ([Clerk Delete User](https://clerk.com/docs/reference/backend-api/tag/Users#operation/DeleteUser)); replace placeholder/lorem content in app and website.
- **Config and credentials:** In `eas.json` replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` with Apple ID; add Android service account key (do not commit); in `.well-known/apple-app-site-association` replace `REPLACE_WITH_APPLE_TEAM_ID`; in `.well-known/assetlinks.json` replace SHA256 fingerprint (from `eas credentials -p android` or Play Console).
- **Privacy and website:** Finalize `apps/website/app/privacy/page.tsx`; deploy website so `https://korb.guru/privacy` is live; set privacy policy URL in App Store Connect and Play Console.
- **Deep links (optional):** After updating .well-known and deploying website, rebuild mobile so OS can verify Universal Links / App Links.
- **Store submission:** Apple: create app in App Store Connect (bundle ID `guru.korb.mobile`), metadata, screenshots, age rating, demo account, upload build, submit. Google: create app in Play Console (package `guru.korb.mobile`), store listing, Data safety, content rating, app access, upload AAB, release.

## Deploy order

Deploy in this order so backends are live before clients use them:

1. **Convex** — Deploy Convex first (schema, functions). Mobile and FastAPI depend on it.
2. **FastAPI** — Deploy the API next. Mobile and Convex may call it; health and env must be correct.
3. **Mobile** — Build and submit last (EAS). Binaries use the already-deployed Convex and API URLs.

| Step | What    | Notes                                                                   |
| ---- | ------- | ----------------------------------------------------------------------- |
| 1    | Convex  | `convex deploy` (or CI); verify dashboard.                              |
| 2    | FastAPI | Deploy to your host; hit `/health` (or equivalent).                     |
| 3    | Mobile  | EAS Build (preview/production); then EAS Submit if releasing to stores. |

## Rollback

- **Convex**: Revert and redeploy from Git (e.g. `convex deploy` from the previous commit), or use Convex dashboard to roll back deployment if supported.
- **FastAPI**: Redeploy the previous image/version from your host or CI; ensure env and secrets match that version.
- **Mobile**: Submit the previous build from EAS (or store rollback). Users on the new build may need to update again after you fix backends.

| Component | Rollback action                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------- |
| Convex    | Redeploy previous Convex version; fix forward or revert code and redeploy.                      |
| FastAPI   | Redeploy previous API build/image; restore env if changed.                                      |
| Mobile    | Submit previous EAS build to stores, or halt new rollout; backend rollback usually comes first. |

## Where config lives

| Layer    | Location                              | Purpose                                                          |
| -------- | ------------------------------------- | ---------------------------------------------------------------- |
| Convex   | `apps/convex/.env`, Convex dashboard  | `CONVEX_DEPLOYMENT`; deployment URL.                             |
| FastAPI  | `apps/api/.env`, platform env         | `CLERK_*`, `CONVEX_*`, `DATABASE_URL`, `QDRANT_URL`, CORS, etc.  |
| Mobile   | `apps/mobile/.env`, EAS env / secrets | `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_CONVEX_URL`, Clerk key. |
| Monorepo | Root `.env`, `.env.example`           | Shared or example vars.                                          |

**Data services (Postgres + Qdrant):** Local dev uses root `compose.yml`; config and seed in `apps/postgres/` and `apps/qdrant/` (pnpm db:up, pnpm db:reset). For deploy use Coolify one-click or any remote Postgres and Qdrant; set `DATABASE_URL` and `QDRANT_URL` on the FastAPI application. Run Postgres migrations in production once per release (e.g. Coolify one-off: `alembic upgrade head` from `apps/api` with production `DATABASE_URL`). Never run `pnpm db:reset` or `pnpm db:seed` against production.

EAS build profiles inject environment at build time. See [Production overview](../architecture/production-overview.md) for traceability and env model.

## Contacts

Escalation points (on-call, Slack channel, incident lead) are defined by the team; add or link them here when established.

## Docs

- [Production overview](../architecture/production-overview.md) — Traceability, env separation, service seams.
- [App Store compliance](../guides/app-store-compliance-checklist.md) — Store and backend checklist.
- [Local development](../guides/local-dev.md) — Port map and local env.
