# ADR 001: FastAPI and Convex Coexistence

**Status:** Accepted  
**Date:** 2026-03-08  
**Deciders:** Project team

This ADR records why we run two backends (Convex + FastAPI) and how we split responsibilities.

- [Context](#context) · [Decision](#decision) · [Consequences](#consequences) · [Related](#related)

## Context

We needed a backend architecture for a meal planning app with:

- Realtime collaborative features (shared lists, meal plans).
- Heavy compute (recommendations, ingestion).
- Third-party integrations (webhooks, external APIs).
- Mobile-first with reactive UI.

## Decision

Run **two backends:**

1. **Convex** — Realtime collaborative state and client-facing data.
2. **FastAPI** — Heavy compute, integrations, and background workflows.

## Consequences

| Owner       | Owns                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------- |
| **Convex**  | Realtime queries to mobile; collaborative state; client mutations with immediate UI reflection. |
| **FastAPI** | Heavy computation; external integrations; scheduled jobs and ingestion.                         |

### Trade-offs

| Approach         | Pros                                                             | Cons                                                  |
| ---------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| **Dual backend** | Right tool per job; Convex for latency, FastAPI for flexibility. | Two services; cross-service calls need care.          |
| Convex-only      | Single platform; simpler ops.                                    | Weak at heavy compute; limited integration ecosystem. |
| FastAPI-only     | Single codebase; Python.                                         | Would need WebSocket infra; no built-in reactivity.   |

We accepted dual-backend because: (1) Convex reactivity fits collaborative UI better than building WebSockets in FastAPI; (2) Python fits ML, data, and integrations better than Convex serverless; (3) split is clear: Convex = client state, FastAPI = compute/orchestration.

### Cross-service patterns

- **FastAPI → Convex:** HTTP POST to Convex HTTP API for data sync.
- **Convex → FastAPI:** Convex actions call FastAPI for heavy work.
- **Rule:** One canonical owner per entity; no dual writes.

## Related

| Doc                                                               | Description              |
| ----------------------------------------------------------------- | ------------------------ |
| [FastAPI ↔ Convex](../architecture/fastapi-convex-interaction.md) | Implementation patterns. |
| [Scraper ingestion](../architecture/scraper-ingestion.md)         | Ingestion pipeline.      |
