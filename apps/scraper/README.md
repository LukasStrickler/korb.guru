# Scraper (@korb/scraper)

Python CLI for Korb data ingestion. Use this app to produce mock data (or later, scraped data) for the pipeline; it uses **uv** and **Click**, outputs to stdout or an ingest endpoint, and has no UI.

- [Setup](#setup) · [Important commands](#important-commands) · [CLI usage](#cli-usage) · [Project structure](#project-structure) · [Docs](#docs)

## Setup

1. **Install Python dependencies** — Requires Python ≥3.11. From this app directory:

   ```bash
   cd apps/scraper
   uv sync
   ```

   Or from repo root: `uv sync --project apps/scraper`.

2. **Set environment variables** (optional) — For ingest mode or config, create `apps/scraper/.env`. Examples:
   ```env
   OUTPUT_FORMAT=json
   OUTPUT_DIR=./output
   # If posting to API ingest:
   # INGEST_API_KEY=...
   ```
   See root [.env.example](../../.env.example). Mock mode needs no env.

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

## Docs

| Doc                                                                | Description                       |
| ------------------------------------------------------------------ | --------------------------------- |
| [Scraper Ingestion](../../.docs/architecture/scraper-ingestion.md) | Pipeline, Convex sync, evolution. |
