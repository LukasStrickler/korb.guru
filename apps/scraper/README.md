# Scraper (@korb/scraper)

Python CLI for Korb data ingestion. Currently generates **mock data** for development and testing. Uses **uv** and **Click**, outputs to stdout or an ingest endpoint. Real scraping is planned but not implemented.

- [Setup](#setup) · [Important commands](#important-commands) · [CLI usage](#cli-usage) · [Project structure](#project-structure) · [Docs](#docs)

## Setup

1. **Install Python dependencies** — Requires Python ≥3.11. From this app directory:

   ```bash
   cd apps/scraper
   uv sync
   ```

   Or from repo root: `uv sync --project apps/scraper`.

2. **Set environment variables** — Create `apps/scraper/.env` from root `.env.example` (optional):

   ```bash
   cp ../../.env.example .env
   ```

   Mock mode works without any env vars. For ingest mode, set:
   - `INGEST_API_KEY` — API key for POST /ingest (or pass `--api-token`)

   See [Local Development](../../.docs/guides/local-dev.md) for full env documentation.

## Important commands

Run from **repo root** with `pnpm --filter @korb/scraper <script>`, or from `apps/scraper` after setup.

| Command                                 | Description                                                    |
| --------------------------------------- | -------------------------------------------------------------- |
| `pnpm --filter @korb/scraper dev`       | Run scraper in dev mode: mock output to stdout, JSON, limit 3. |
| `pnpm --filter @korb/scraper lint`      | Run Ruff.                                                      |
| `pnpm --filter @korb/scraper typecheck` | Python compile check.                                          |
| `pnpm --filter @korb/scraper test`      | Run pytest.                                                    |

From inside `apps/scraper`: use `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. Or run `uv run scraper --sink stdout --format json --limit 3` (dev), `uv run scraper --help` (options), `uv run pytest` (test).

## CLI usage

| Use case                     | Command                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Mock to stdout (default dev) | `uv run scraper --sink stdout --format json [--limit N]`                                                         |
| Output to file               | `uv run scraper --sink file --output-dir ./out --format json`                                                    |
| Ingest to API                | Set `INGEST_API_KEY` (or `--api-token`); see [Scraper Ingestion](../../.docs/architecture/scraper-ingestion.md). |

## Project structure

| Path               | Description                                    |
| ------------------ | ---------------------------------------------- |
| `src/cli.py`       | Click entrypoint (`scraper` / `korb-scraper`). |
| `src/ingestion.py` | Mock data and ingestion logic.                 |
| `tests/`           | Pytest tests.                                  |

## Scaffold status

This app is scaffold-only. Current capabilities:

- Mock recipe and user data generation (deterministic)
- Output to stdout, file, FastAPI, or Convex
- Basic HTTP POST with optional Bearer token

Out of scope (add when ownership is stable):

- Real recipe scraping from external sources
- Delivery retries with idempotency
- Queue/scheduler integration
- Dead-letter and replay handling
- Schema validation against shared contracts

See [Scraper Ingestion](../../.docs/architecture/scraper-ingestion.md) for the full pipeline design.

## Docs

| Doc                                                                | Description                       |
| ------------------------------------------------------------------ | --------------------------------- |
| [Scraper Ingestion](../../.docs/architecture/scraper-ingestion.md) | Pipeline, Convex sync, evolution. |
