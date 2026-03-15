# Apify Actors -- korb.guru

korb.guru uses Apify Actors as the backbone of its grocery data pipeline. Each Actor
follows the UNIX philosophy: **do one thing and do it well**. A single-purpose scraper
collects raw product data; a separate AI agent reasons over it. Pre-built platform
Actors fill the gaps (maps, recipes, LLM inference) so we never reinvent the wheel.

---

## Architecture Overview

```
                         Apify Platform
  +---------------------------------------------------------+
  |                                                         |
  |  +-------------------------+    +--------------------+  |
  |  | swiss-grocery-scraper   |    | shopping-agent     |  |
  |  | (custom Actor)          |    | (custom Actor)     |  |
  |  |                         |    |                    |  |
  |  | Aldi -----> Docling OCR |    | Orchestrator:      |  |
  |  | Migros ---> Issuu + PW  |    |  cache check (KV)  |  |
  |  | Coop -----> Playwright  |    |  -> scrape -> search|  |
  |  | Denner ---> BS4 + Issuu |    |  -> LLM reason     |  |
  |  | Lidl -----> PW + Docling|    |  -> Google Maps    |  |
  |  |                         |    |  -> recommend      |  |
  |  +-----------|-------------+    +----|---------------+  |
  |              |                       |                  |
  |              v                       v                  |
  |        Dataset JSON           Actor key-value store     |
  |              |                  (query cache + results) |
  |  +-----------|-----+---------+       |                  |
  |  | Platform Actors |         |       |                  |
  |  | Google Maps  <--|---------|-------+                  |
  |  | Content Crawler |         |       (find_stores)      |
  |  | OpenRouter LLM  |         |                          |
  |  +-----------|-----+---------+                          |
  +-----------|--------------------------|-----------------+
              |  Webhook POST            |
              v                          v
  +---------------------------+   +-------------+
  | FastAPI  /ingest          |   | Qdrant      |
  | (accepts product records) |   | (vectors)   |
  +-----------|---------------+   +------^------+
              |                          |
              v                          |
  +---------------------------+          |
  | PostgreSQL                |----------+
  | (products, prices, users) |  embed + upsert
  +---------------------------+
```

---

## 1. `korb-guru/swiss-grocery-scraper` (Custom)

**Status:** Deployed and running on Apify Cloud.
**Source:** `crawler/apify/actors/swiss-grocery-scraper/`

A single Actor that scrapes weekly offers from all five major Swiss grocery
retailers. It combines three extraction strategies under one roof:

| Strategy               | Library                        | Used by            |
| ---------------------- | ------------------------------ | ------------------ |
| PDF prospekt OCR       | Docling `DocumentConverter`    | Aldi, Lidl         |
| Issuu page-image OCR   | httpx + Docling OCR            | Migros, Denner     |
| HTML scraping (JS)     | Crawlee `PlaywrightCrawler`    | Migros, Coop, Lidl |
| HTML scraping (static) | Crawlee `BeautifulSoupCrawler` | Denner             |

### Per-Retailer Breakdown

**Aldi** -- PDF download + Docling OCR

- Constructs a deterministic URL using the current calendar week (`KW{nn}`)
  pointing to Aldi's Scene7 CDN.
- Downloads the full weekly prospekt PDF in one HTTP call.
- Hands raw PDF bytes to Docling, which converts each page to markdown.
- A regex parser walks the markdown to extract `(name, price)` tuples.

**Migros** -- Issuu Wochenflyer + Playwright HTML

- Two-phase scrape. Phase 1 downloads page images from Migros's Issuu
  publication (`m-magazin/migros-wochenflyer-{KW}-{YEAR}-d-aa`) and runs
  Docling OCR on each JPEG. Phase 2 launches a headless Chromium instance via
  Crawlee Playwright to scrape `migros.ch/de/aktionen.html`, extracting
  product cards with JS `document.querySelectorAll`.
- Results are merged and deduplicated by product name.

**Coop** -- Playwright HTML

- Single-phase Crawlee Playwright crawl against `coop.ch/de/aktionen.html`.
- Evaluates a JS snippet in-page that queries product card DOM nodes and
  returns name, price, image URL, and discount badge text.

**Denner** -- BeautifulSoup HTML + Issuu Wochenprospekt

- Phase 1 uses Crawlee BeautifulSoup (no browser needed) to parse the static
  HTML at `denner.ch/de/aktionen-und-sortiment/aktuelle-aktionen`.
- Phase 2 downloads the Issuu publication (`denner-ch/{YEAR}-{KW}-de`) page
  images and runs Docling OCR, same as Migros.
- Deduplicates Issuu results against the HTML set.

**Lidl** -- Playwright PDF discovery + Docling OCR

- Launches Playwright against Lidl's PDF prospekt listing page.
- Extracts all `<a href="*.pdf">` links via JS evaluation.
- Downloads up to 3 PDFs via httpx, then feeds each to Docling for product
  extraction.

### Input Schema

```json
{
  "retailers": {
    "type": "array",
    "items": { "enum": ["aldi", "migros", "coop", "denner", "lidl"] },
    "default": ["aldi", "migros", "coop", "denner", "lidl"]
  },
  "region": {
    "type": "string",
    "enum": ["zurich", "bern", "basel"],
    "default": "zurich"
  },
  "maxItems": {
    "type": "integer",
    "default": 200
  },
  "webhookUrl": {
    "type": "string",
    "description": "URL to POST notification to after scraping completes"
  },
  "webhookApiKey": {
    "type": "string",
    "isSecret": true,
    "description": "API key for webhook Authorization header"
  }
}
```

### Output Schema (per record pushed to dataset)

```json
{
  "retailer": "migros",
  "name": "Bio Bananen 1kg",
  "price": 2.95,
  "discount_pct": 20.0,
  "image_url": "https://...",
  "category": "offer",
  "valid_to": "2026-03-22"
}
```

### Runtime

- **Base image:** `apify/actor-python:3.12`
- **Package manager:** `uv` (pinned at `0.6.12`, copied from the official
  `ghcr.io/astral-sh/uv` image for deterministic builds)
- **Key dependencies:** `crawlee[playwright,beautifulsoup]>=1.5`, `docling>=2.70`,
  `httpx==0.28.*`
- **Browser:** Chromium installed at build time via `playwright install`
- **Concurrency:** Parallel retailer processing via `asyncio.gather()`; within
  each retailer, Issuu pages are fetched sequentially with a 1.5 s rate-limit
  delay.

---

## 2. `korb-guru/shopping-agent` (Custom)

**Status:** Built, ready for deployment.
**Source:** `crawler/apify/actors/shopping-agent/`

An AI agent Actor that chains the scraper output into personalized
shopping recommendations via a multi-step orchestration pipeline. It uses
Apify's Key-Value Store for query-level caching and can optionally call the
`apify/google-maps-scraper` platform Actor to find nearby stores.

### Agent Flow

```
  User query: "Guenstige Bio-Milch diese Woche"
         |
         v
  +-------------------------------+
  | 0. Check KV store cache       |
  |    (Actor.get_value by query  |
  |     hash) -- return early if  |
  |     cached result exists      |
  +-------------------------------+
         |  cache miss
         v
  +-------------------------------+
  | 1. Optional: trigger swiss-   |
  |    grocery-scraper to refresh |
  |    product data (scrape_fresh)|
  +-------------------------------+
         |
         v
  +-------------------------------+
  | 2. Qdrant hybrid search       |
  |    - dense: MiniLM (384-dim)  |
  |    - sparse: BM25 hashing     |
  |    - filter: retailer, price, |
  |      region                   |
  +-------------------------------+
         |
         v
  +-------------------------------+
  | 3. LLM reasoning via          |
  |    OpenRouter API              |
  |    - model: configurable       |
  |    - prompt: rank by value,   |
  |      explain savings          |
  +-------------------------------+
         |
         v
  +-------------------------------+
  | 4. Optional: Google Maps      |
  |    store lookup (find_stores) |
  |    - calls apify/google-maps- |
  |      scraper for each retailer|
  |    - returns address, hours,  |
  |      rating, coordinates      |
  +-------------------------------+
         |
         v
  +-------------------------------+
  | 5. Cache result in KV store   |
  |    + return structured JSON   |
  |    recommendations + nearby   |
  |    store info                 |
  +-------------------------------+
```

**Chaining mechanism:** When `scrape_fresh` is true, the agent calls the scraper
Actor via the Apify client (`ApifyClientAsync`), waits for completion, then
queries Qdrant with the user's query and passes matching products as context to
the LLM via OpenRouter. When `find_stores` is true, it additionally calls the
`apify/google-maps-scraper` platform Actor to find nearby stores for the
retailers present in the results.

**Caching:** Before any work, the agent computes a SHA-256 hash from the query,
budget, retailers, and region, and checks the Actor's default Key-Value Store
(`Actor.get_value()`). On a cache hit the stored result is returned immediately.
On a cache miss the full pipeline runs and the result is written back via
`Actor.set_value()`.

### Input Schema

```json
{
  "query": {
    "type": "string",
    "description": "Shopping query in any language"
  },
  "budget": { "type": "number", "description": "Max budget in CHF" },
  "preferred_retailers": {
    "type": "array",
    "items": { "enum": ["aldi", "migros", "coop", "denner", "lidl"] }
  },
  "region": {
    "type": "string",
    "enum": ["zurich", "bern", "basel"],
    "default": "zurich"
  },
  "qdrant_url": { "type": "string" },
  "qdrant_api_key": { "type": "string", "isSecret": true },
  "openrouter_api_key": { "type": "string", "isSecret": true },
  "scrape_fresh": { "type": "boolean", "default": false },
  "find_stores": { "type": "boolean", "default": false }
}
```

### Runtime

- **Base image:** `apify/actor-python:3.12`
- **Package manager:** `uv`
- **Key dependencies:** `apify`, `apify-client`, `qdrant-client[fastembed]`, `httpx`

---

## 3. Platform Actors (Pre-Built)

### Google Maps Scraper (`apify/google-maps-scraper`)

- **Purpose:** Fetch store locations (lat/lng, address, opening hours) for all
  five retailers in the user's region.
- **Use case:** Route optimization -- find the nearest stores that carry the
  user's desired products, minimize travel distance.
- **Integration:** Called directly by the shopping-agent when `find_stores` is
  true. The agent searches for each recommended retailer near the user's region,
  returning up to 3 locations per retailer with address, rating, coordinates,
  and opening hours. Results are also stored in PostgreSQL `stores` table and
  exposed via the `/stores` API endpoint.

### Website Content Crawler

- **Purpose:** Import recipe content from arbitrary URLs.
- **Use case:** A user pastes a recipe link; the crawler extracts ingredients,
  which are then matched against current offers via Qdrant search.
- **Integration:** Crawled HTML is cleaned and passed to the LLM for structured
  ingredient extraction.

### OpenRouter Proxy Actor

- **Purpose:** LLM inference without managing API keys per model.
- **Use case:** The shopping agent and recipe parser use this for all LLM calls.
  During the hackathon, free credits eliminate cost concerns.
- **Models used:** `google/gemini-2.5-flash` via OpenRouter for
  fast structured extraction and reasoning.

---

## Webhook Integration

The scraper supports two webhook mechanisms:

### In-Actor Webhook (Primary)

When `webhookUrl` is provided in the Actor input, the scraper sends a POST
notification directly after scraping completes. This is handled in the Actor
code itself via `httpx`:

```
POST <webhookUrl>
Content-Type: application/json
Authorization: Bearer <webhookApiKey>

{
  "event": "scrape_completed",
  "total_items": 847,
  "region": "zurich",
  "retailers": ["aldi", "migros", "coop", "denner", "lidl"],
  "duration_s": 142.3
}
```

### Apify Platform Webhook (Alternative)

Apify's built-in webhook system can also fire on Actor run completion,
sending a POST request to the backend `/ingest` endpoint.

### Backend Processing

The FastAPI `/ingest` endpoint (at `apps/api/src/routes/ingest.py`) validates
the payload via the `IngestRequest` Pydantic model, authenticates with
`require_ingest_auth`, and responds with HTTP 202 Accepted.

From there, an async background task embeds each product name using
MiniLM and upserts the vectors into Qdrant, while also writing
the structured records to PostgreSQL.

---

## Scheduling

Apify Schedules automate the entire pipeline on a weekly cadence:

| Schedule         | Cron        | Actor                   | Notes                                |
| ---------------- | ----------- | ----------------------- | ------------------------------------ |
| Weekly scrape    | `0 6 * * 1` | `swiss-grocery-scraper` | Monday 06:00 UTC, all 5 retailers    |
| Mid-week refresh | `0 6 * * 4` | `swiss-grocery-scraper` | Thursday 06:00 UTC, catch new flyers |
| Store locations  | `0 0 1 * *` | Google Maps Scraper     | Monthly, store data is stable        |

The weekly scrape input is:

```json
{
  "retailers": ["aldi", "migros", "coop", "denner", "lidl"],
  "region": "zurich",
  "maxItems": 200
}
```

---

## Design Principles

1. **Single responsibility.** The scraper only scrapes. It does not embed, does
   not query Qdrant, does not call LLMs. Data flows forward through webhooks.

2. **Deterministic URLs.** Aldi, Migros, and Denner flyer URLs are constructed
   from the calendar week number, making scraping predictable and debuggable
   without fragile link discovery.

3. **Graceful degradation.** Each retailer scraper catches its own exceptions.
   If Lidl's PDF page is down, the other four retailers still produce data.
   The Actor always completes; partial data is better than no data.

4. **Deduplication at source.** Every scraper maintains a `seen` set keyed on
   `name.lower()` to prevent duplicate records before they ever reach the
   dataset or the backend.

5. **Rate limiting.** Issuu page downloads are throttled at 1.5 s per page.
   Crawlee crawlers are capped at 10 requests/minute. We respect the sites
   we scrape.

6. **Reproducible builds.** The Dockerfile pins `uv` to a specific release
   tag and uses `--no-cache` to ensure clean installs. The `apify/actor-python`
   base image provides a known-good Python 3.12 environment.
