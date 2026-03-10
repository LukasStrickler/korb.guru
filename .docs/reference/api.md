# API Reference

Where the HTTP API lives and how to discover its surface. For auth and ingest details, see [Auth reference](auth.md).

## Base URL and OpenAPI

| Environment | Base URL                                     | OpenAPI UI                                               |
| ----------- | -------------------------------------------- | -------------------------------------------------------- |
| Local       | `http://localhost:8000`                      | [http://localhost:8000/docs](http://localhost:8000/docs) |
| Production  | Your API host (e.g. `https://api.korb.guru`) | `{base}/docs`                                            |

The API is FastAPI; interactive docs and schema are at `/docs` when the server is running.

## Route groups

- **Health** — `GET /health` (no auth).
- **Auth / me** — Protected routes using Clerk JWT; see [Auth reference](auth.md).
- **Ingest** — `POST /ingest` (API key or header); see [Scraper ingestion](../architecture/scraper-ingestion.md).

## TypeScript types (generated)

Generated types from OpenAPI live in `packages/contracts/src/generated/api/`. Do not edit; regenerate with `pnpm contracts:generate`. See [Contracts and codegen](../guides/contracts.md).
