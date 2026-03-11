# Scraper Agent Context

Recipe ingestion CLI using Click.

## STRUCTURE

```
src/
  cli.py         # Click entrypoint (main function)
  ingestion.py   # Mock data and HTTP posting logic
tests/
  test_smoke.py  # Pytest smoke tests
pyproject.toml   # Scripts: scraper, korb-scraper
```

## WHERE TO LOOK

| Task               | Location                                                      |
| ------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add CLI command    | `src/cli.py` — add `@click.option` + param to `main()`        |
| Add mock data      | `src/ingestion.py` — `get_mock_recipes()`, `get_mock_users()` |
| Add output format  | `src/ingestion.py` — `serialize_records()`                    |
| Add tests          | `tests/test_*.py` — pytest functions                          |
| Add/update env var | **Root** `.env.example` (and root `.env` for local)           | Scraper receives env from root when run via root scripts (e.g. `INGEST_API_KEY`). See [.docs/guides/local-dev.md](../../.docs/guides/local-dev.md). |

## CONVENTIONS

**Click CLI**

- Use `@click.command()` + `@click.option()` decorators
- Type hints: `Path | None`, `str | None` (Python 3.11+)
- Use `click.echo()` for output, `click.ClickException` for errors
- Entry: `src.cli:main` mapped to `scraper` and `korb-scraper` scripts

**Ingestion Workflow**

- `run_mock_ingestion(limit)` generates records with `type` field
- Sinks: `stdout`, `file`, `fastapi`, `convex`
- Formats: `json` (array), `jsonl` (newline-delimited)
- HTTP POST: `post_records_to_endpoint()` with optional Bearer token

**Python Tooling**

- Package manager: `uv` (sync, run)
- Lint/format: `ruff` (line-length 88, py311)
- Test: `pytest`
- Commands: `uv run scraper`, `uv run ruff check src`, `uv run pytest`

## Service ownership

Scraper feeds **one** canonical owner per entity per flow:

- **FastAPI-owned entities** → POST to FastAPI `/ingest` (or specific endpoint)
- **Convex-owned entities** → POST to Convex HTTP endpoint
- **Avoid dual writes** of the same entity in one run

Scraper does NOT:

- Own any persistent data (stateless CLI)
- Handle retries or queuing (caller responsibility)
- Validate against shared contracts (out of scope for scaffold)

See [FastAPI ↔ Convex](../../.docs/architecture/fastapi-convex-interaction.md) for service boundaries.

## Scaffold status

Current implementation:

- Mock data only (`get_mock_recipes()`, `get_mock_users()`)
- Synchronous HTTP via `urllib.request`
- No real scraping from external sources

Add when moving beyond scaffold:

- Real scraping logic (BeautifulSoup, Playwright, etc.)
- Async HTTP for concurrent requests
- Retry logic with exponential backoff
- Schema validation before POST

## ANTI-PATTERNS

- Do not hardcode secrets — use `INGEST_API_KEY` env var or `--api-token`
- Do not block the event loop — use `urllib.request` (sync) or add async carefully
- Do not print directly — use `click.echo()` for testable output
- Do not commit `.venv/` — it's gitignored but verify before commits
