# Apify Crawler Integration

## Overview

The Apify crawler uses a single custom Actor (`korb-guru/swiss-grocery-scraper`, ID: `qeEDAn8QsQNc5P5oB`) to scrape all 5 Swiss grocery retailers: Aldi, Migros, Coop, Denner, and Lidl.

## Architecture

```
crawler/apify/
├── orchestrator.py      # Main runner: executes Actor with retry logic
├── config.py            # Actor ID, tokens, retailer configs
├── google_maps.py       # Google Maps Store Discovery (compass/crawler-google-places)
├── ingest/
│   ├── transform.py     # Normalize + validate data (_is_junk_name ~15 filter rules)
│   └── pipeline.py      # Embed + upsert to Qdrant
└── actors/
    └── swiss-grocery-scraper/   # Custom Apify Actor
        ├── .actor/
        │   ├── actor.json       # Actor manifest
        │   └── input_schema.json
        ├── Dockerfile
        ├── requirements.txt
        └── src/
            ├── main.py          # Actor entry point
            ├── routes.py        # Per-retailer scraping handlers
            └── pdf_extract.py   # PDF extraction (block extractor + pdfplumber + Docling)
```

## Scraping Methods

| Retailer | Method                             | Source                                                                            | Local Extraction   |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------- | ------------------ |
| Aldi     | Block extractor (pdfplumber)       | Scene7 CDN PDF, article-number anchoring (5-6 digits)                             | ~146 products/week |
| Lidl     | Block extractor (pdfplumber) + API | PDF via block extractor (7-digit article numbers) + sortiment.lidl.ch API         | ~129 products/week |
| Coop     | Crawlee Playwright                 | aktionen HTML page — ePaper PDFs are newspaper ads, coop.ch blocked by Cloudflare | Problematic        |
| Denner   | HTML Scraping                      | denner.ch/aktionen (accessible, ~466 products)                                    | Works              |
| Migros   | Crawlee Playwright                 | Issuu page images — direct HTTP returns 403, needs Playwright                     | Needs work         |

## PDF Block Extraction

The block extractor (`_extract_blocks()` in `pdf_extract.py`) handles Aldi and Lidl flyer PDFs which use visual grid layouts:

1. **Find article number anchors** — Aldi uses 5-6 digit codes, Lidl uses 7-digit codes
2. **Search upward** in a vertical strip above each anchor for product name, price, discount
3. **Ceiling constraint** — the search zone is limited by the nearest anchor above to prevent merging adjacent product blocks
4. **Hyphen joining** — handles split words like "Lachs-" + "spitzen" → "Lachsspitzen"
5. **Doubled character fix** — deduplicates overlapping text layers ("FFrrhhlliinngg" → "Frühling")

## Usage

```bash
# Set Apify token
export APIFY_TOKEN=your-token

# Run all retailers
python -m crawler.apify.orchestrator

# Run single chain
python -m crawler.apify.orchestrator --chain=aldi

# Run + ingest to Qdrant
python -m crawler.apify.orchestrator --ingest

# Dry run (show what would execute)
python -m crawler.apify.orchestrator --dry-run
```

## Publishing the Custom Actor

```bash
cd crawler/apify/actors/swiss-grocery-scraper

# Install Apify CLI
npm install -g apify-cli

# Login
apify login --token YOUR_TOKEN

# Push to Apify platform
apify push
```

## Data Pipeline

```
Apify Actor Run
    └── Dataset (JSON items)
        └── transform.py (normalize + price validation)
            └── pipeline.py (embed + upsert)
                └── Qdrant (products collection)
```

## Retry Logic

The orchestrator retries failed Actor runs up to 2 times with exponential backoff (5s, 10s). Configurable via `MAX_RETRIES` and `ACTOR_TIMEOUT_SECS` in config.py.

## Google Maps Store Discovery

Discovers grocery store locations using the `compass/crawler-google-places` Apify actor (~$4/1000 places).

```bash
# Discover all brands in Zürich
python -m crawler.apify.google_maps

# Single brand
python -m crawler.apify.google_maps --brand=migros

# Dry run (fetch but don't ingest)
python -m crawler.apify.google_maps --dry-run

# Custom API endpoint
python -m crawler.apify.google_maps --ingest-url=http://localhost:8001
```

Stores are ingested via `POST /api/v1/stores/ingest` and deduplicated by Google Place ID. Brands detected: Migros, Coop, Aldi Suisse, Lidl, Denner.

## Normalization & Quality Filters

`transform.py` normalizes raw Actor output and applies comprehensive junk filters:

- Junk name regex (dates, travel content, metadata, price fragments)
- Category header detection (single words like "Fleisch", "Getränke")
- All-caps headers, color-only names, non-grocery keywords
- OCR artefact detection (doubled characters, concatenated words, repeated words)
- Non-grocery product filter (beauty, electronics, bedding, travel)
- Price validation (CHF 0.10 – 500.00)

Typical filtering rate: ~27% of raw items removed as junk.
