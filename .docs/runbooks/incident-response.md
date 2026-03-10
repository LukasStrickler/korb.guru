# Incident Response

Runbook for initial checks, logs, and escalation when something is wrong in production or staging.

- [Who to check](#who-to-check) · [Logs](#logs) · [Escalation](#escalation) · [Contacts](#contacts) · [Docs](#docs)

## Who to check

Verify these in order when diagnosing an incident:

| System      | What to check                                                | Where                                                                                       |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Convex**  | Convex dashboard: deployment status, function errors, usage. | [Convex dashboard](https://dashboard.convex.dev) (your deployment).                         |
| **FastAPI** | Health endpoint and process.                                 | `GET /health` (or your health route) on API base URL (e.g. `https://api.korb.guru/health`). |
| **Mobile**  | EAS build status, store listing, crash/analytics.            | EAS dashboard; App Store Connect / Play Console; PostHog or your analytics.                 |

- **Convex dashboard** — Confirm deployment is healthy; inspect logs and errors for Convex functions.
- **FastAPI health** — If health fails, API is down or misconfigured; check host logs and env.
- **Mobile build** — If builds fail, check EAS logs; if app crashes, check analytics and backend availability (Convex/API).

## Logs

| Source  | Where to look                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------ |
| Convex  | Convex dashboard → Logs / Function logs for your deployment.                                           |
| FastAPI | Host/container logs (e.g. stdout, your logging driver); ensure request IDs or correlation for tracing. |
| Mobile  | EAS build logs; in-app: PostHog or other analytics for errors/events.                                  |
| Scraper | Scraper run logs (CI or job runner); ingestion errors may show in API or Convex.                       |

## Escalation

- **Backend down (Convex or FastAPI)** — Roll back or fix the offending service first; see [Deploy and rollback](deploy-and-rollback.md). Notify stakeholders if outage affects users.
- **Mobile broken** — If backends are healthy, check EAS build, env vars in build profile, and store-specific issues (e.g. provisioning, keys).
- **Security or data concern** — Escalate; do not self-investigate security. Follow your org’s security process.

## Contacts

Escalation points (on-call, Slack channel, incident lead) are defined by the team; add or link them here when established.

## Docs

- [Deploy and rollback](deploy-and-rollback.md) — Deploy order and rollback steps.
- [Production overview](../architecture/production-overview.md) — Service seams and config.
