# Apify Actors — korb.guru

korb.guru uses Apify Actors for grocery data scraping and store discovery.

---

## Architecture Overview

```
                         Apify Platform
  +---------------------------------------------------------+
  |                                                         |
  |  +-------------------------+    +--------------------+  |
  |  | swiss-grocery-scraper   |    | compass/           |  |
  |  | (custom Actor v0.4)     |    | crawler-google-    |  |
  |  |                         |    | places             |  |
  |  | Aldi -----> PDF + OCR   |    | (platform Actor)   |  |
  |  | Migros ---> Playwright  |    |                    |  |
  |  | Coop -----> ePaper API  |    | Discovers stores   |  |
  |  | Denner ---> BS4 HTML    |    | for all 5 brands   |  |
  |  | Lidl -----> API + PDF   |    |                    |  |
  |  +-----------|-------------+    +----|---------------+  |
  |              |                       |                  |
  |              v                       v                  |
  |        Dataset JSON            Dataset JSON             |
  +-----------|--------------------------|-----------------+
              |  POST /ingest            |  POST /api/v1/stores/ingest
              v                          v
  +---------------------------+   +---------------------------+
  | FastAPI Backend           |   | PostgreSQL                |
  | (apps/api)                |-->| products + stores tables  |
  +-----------|---------------+   +-------------|-------------+
              |                                 |
              v                                 |
  +---------------------------+                 |
  | Qdrant (vector search)    |<----------------+
  | products collection       |   embed + upsert
  +---------------------------+
```

---

## 1. `korb-guru/swiss-grocery-scraper` (Custom)

**Status:** Deployed on Apify Cloud (build 0.4.21).
**Source:** `crawler/apify/actors/swiss-grocery-scraper/`
**Last verified:** 374 items from 5/5 retailers in 222s.

A single Actor that scrapes weekly offers from five Swiss grocery retailers.
Scrapers run **sequentially** (not parallel) to avoid Crawlee shared request
queue conflicts.

### Per-Retailer Breakdown

| Retailer | Method                        | Data Source                | Price Coverage | Items (typical) |
| -------- | ----------------------------- | -------------------------- | -------------- | --------------- |
| Aldi     | PDF + Docling OCR             | Scene7 CDN (`KW{nn}` URL)  | 100%           | ~30             |
| Migros   | Playwright (headless browser) | migros.ch/de/offers/home   | 100%           | ~50             |
| Coop     | ePaper JSON API + pdfplumber  | epaper.coopzeitung.ch API  | 100%           | ~60             |
| Denner   | BeautifulSoup HTML            | denner.ch aktionen page    | 100%           | ~30             |
| Lidl     | Leaflets API + PDF enrichment | endpoints.leaflets.schwarz | ~50%           | ~200            |

**Aldi** — Constructs deterministic PDF URL from current calendar week
(`s7g10.scene7.com/is/content/aldi/AW_KW{kw}_...`). Downloads PDF, runs
Docling OCR to extract product names and prices.

**Migros** — Launches headless Chromium via Crawlee Playwright. Scrolls the
offers page to trigger lazy loading, then extracts product cards via JS
`querySelectorAll` on Angular components.

**Coop** — Uses the public ePaper JSON API (no browser needed):

1. `findEditionsFromDate` — discovers latest Coopzeitung edition (defId=1130)
2. `getPages` — fetches page metadata, filters by `pmDepartment="anzeigen"`
3. Downloads HIGHRES PDFs from pre-signed S3 URLs
4. Extracts products via pdfplumber (skip_ocr=True for single-page PDFs)

**Denner** — Static HTML scraping via BeautifulSoup. Parses `.product-item`
cards, extracts prices from "X statt Y" format.

**Lidl** — Hybrid approach:

1. Scrapes flyer page for slug patterns (regex)
2. Calls Leaflets API (`endpoints.leaflets.schwarz/v4/flyer`) for product names
3. Downloads PDF for price enrichment (best-effort ~50% match rate)

### Known Limitations

- **Aldi**: Falls back across 3 URL variants; returns empty if all fail
- **Migros**: Only 3 scroll iterations — may miss products below fold
- **Coop**: Limited to 30 pages per run; department filter may miss some offers
- **Denner**: Single-page results only (no pagination)
- **Lidl**: Price matching by name is lossy; no discount extraction

### Input Schema

```json
{
  "retailers": ["aldi", "migros", "coop", "denner", "lidl"],
  "region": "zurich",
  "maxItems": 200,
  "webhookUrl": "https://api.korb.guru/ingest",
  "webhookApiKey": "secret"
}
```

### Output Schema (per record)

```json
{
  "retailer": "migros",
  "name": "Bio Bananen 1kg",
  "price": 2.95,
  "discount_pct": 20.0,
  "image_url": "https://...",
  "category": "offer",
  "region": "zurich"
}
```

### Runtime

- **Base image:** `apify/actor-python:3.12`
- **Package manager:** `uv` (pinned)
- **Key deps:** `crawlee[playwright,beautifulsoup]>=1.5`, `docling>=2.70`,
  `pdfplumber>=0.11`, `httpx==0.28.*`
- **Execution:** Sequential per retailer (avoids shared request queue conflicts)

---

## 2. Google Maps Store Discovery

**Actor:** `compass/crawler-google-places` (platform Actor)
**Orchestrator:** `crawler/apify/google_maps.py`
**Cost:** ~$4/1,000 places ($0.02/run for Zürich)

Discovers physical store locations for all five retailers via Google Maps.
Returns name, address, coordinates, phone, website, rating, and opening hours.

### Usage

```bash
# Discover all brands in Zürich
python -m crawler.apify.google_maps

# Single brand
python -m crawler.apify.google_maps --brand=migros

# Dry run (fetch but don't ingest)
python -m crawler.apify.google_maps --dry-run

# Custom location + ingest to remote API
python -m crawler.apify.google_maps --location="Bern, Schweiz" \
  --ingest-url=https://api.korb.guru --api-key=secret
```

### Data Flow

1. Runs Google Maps actor with brand-specific search queries
2. Transforms results to match `POST /api/v1/stores/ingest` schema
3. API upserts to PostgreSQL `stores` table (dedup by `google_place_id`)

### Store Model Fields

| Field              | Source                            |
| ------------------ | --------------------------------- |
| name               | Google Maps `title`               |
| brand              | Auto-detected from title          |
| latitude/longitude | Google Maps `location.lat/lng`    |
| address            | Google Maps `address`             |
| google_place_id    | Unique dedup key                  |
| phone              | Google Maps `phone`               |
| website            | Google Maps `website`             |
| rating             | Google Maps `totalScore`          |
| opening_hours      | Google Maps `openingHours` (JSON) |

---

## 3. Data Ingestion Pipeline

### Products: Scraper → PostgreSQL + Qdrant

Two ingestion paths exist:

**Path A: API endpoint (recommended)**

```
Apify Actor → POST /ingest (FastAPI)
  → Background task: embed with MiniLM
  → Postgres upsert (ON CONFLICT by MD5(retailer:name))
  → Qdrant upsert (dense + sparse vectors)
```

**Path B: Orchestrator CLI (legacy)**

```
python -m crawler.apify.orchestrator --ingest
  → Apify Client → fetch dataset
  → Normalize → embed → Qdrant upsert (bypasses Postgres!)
```

Path A is preferred — it writes to both Postgres and Qdrant atomically.
Path B only writes to Qdrant (data inconsistency risk).

### Stores: Google Maps → PostgreSQL

```
python -m crawler.apify.google_maps
  → Google Maps actor → fetch places
  → POST /api/v1/stores/ingest
  → Postgres upsert (ON CONFLICT by google_place_id)
```

### How to Fill Qdrant with Real Data

1. **Start infrastructure:**

   ```bash
   docker compose up -d postgres qdrant
   ```

2. **Run migrations:**

   ```bash
   cd apps/api && uv run alembic upgrade head
   ```

3. **Start the API:**

   ```bash
   cd apps/api && uv run uvicorn src.main:app --reload
   ```

4. **Run the scraper on Apify and ingest:**

   ```bash
   # Option A: Use orchestrator (fetches from Apify, POSTs to local API)
   python -m crawler.apify.orchestrator --ingest

   # Option B: Manual — run actor on Apify, then fetch + POST
   curl -X POST https://api.apify.com/v2/acts/korb-guru~swiss-grocery-scraper/run-sync-get-dataset-items \
     -H "Authorization: Bearer $APIFY_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"retailers":["aldi","migros","coop","denner","lidl"],"region":"zurich","maxItems":200}' \
     -o products.json

   # Then POST to local API
   curl -X POST http://localhost:8000/ingest \
     -H "Content-Type: application/json" \
     -d '{"source":"apify","records":'$(cat products.json)'}'
   ```

5. **Discover stores:**
   ```bash
   python -m crawler.apify.google_maps --ingest-url=http://localhost:8000
   ```

---

## Scheduling

| Schedule         | Cron        | Actor                          | Notes              |
| ---------------- | ----------- | ------------------------------ | ------------------ |
| Weekly scrape    | `0 6 * * 1` | swiss-grocery-scraper          | Monday 06:00 UTC   |
| Mid-week refresh | `0 6 * * 4` | swiss-grocery-scraper          | Thursday 06:00 UTC |
| Store locations  | `0 0 1 * *` | Google Maps (via orchestrator) | Monthly            |

---

## Environment Variables

| Variable             | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `APIFY_TOKEN`        | Apify API authentication                 |
| `INGEST_API_KEY`     | Auth for POST /ingest and /stores/ingest |
| `DATABASE_URL`       | PostgreSQL connection string             |
| `QDRANT_MODE`        | docker / cloud / local / memory          |
| `EMBEDDING_PROVIDER` | local (MiniLM) or openai                 |

---

## Design Principles

1. **Single responsibility.** Scraper only scrapes. Embedding and storage
   happen in the backend.

2. **Sequential execution.** Retailer scrapers run one at a time to avoid
   Crawlee's shared request queue conflicts.

3. **Graceful degradation.** Each retailer catches its own exceptions.
   Partial data is better than no data.

4. **Deduplication at source.** Every scraper deduplicates by `name.lower()`.
   Backend deduplicates by `MD5(retailer:name)` UUID.

5. **Idempotent upserts.** Both products (MD5 UUID) and stores
   (google_place_id) use ON CONFLICT DO UPDATE for safe re-runs.
