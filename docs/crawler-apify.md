# Apify Crawler Integration

## Overview

The Apify crawler uses a single custom Actor (`korb-guru/swiss-grocery-scraper`) to scrape all 5 Swiss grocery retailers: Aldi, Migros, Coop, Denner, and Lidl.

## Architecture

```
crawler/apify/
├── orchestrator.py      # Main runner: executes Actor with retry logic
├── config.py            # Actor ID, tokens, retailer configs
├── ingest/
│   ├── transform.py     # Normalize + validate data
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
            └── routes.py        # Per-retailer scraping handlers
```

## Scraping Methods

| Retailer | Method                        | Source                                                     |
| -------- | ----------------------------- | ---------------------------------------------------------- |
| Aldi     | httpx + Docling               | Scene7 CDN PDF download, Docling OCR extraction            |
| Migros   | Issuu + Crawlee Playwright    | Issuu page images via Docling OCR + aktionen HTML scraping |
| Coop     | Crawlee Playwright            | aktionen HTML page, product card extraction                |
| Denner   | Issuu + Crawlee BeautifulSoup | Issuu page images via Docling OCR + SSR HTML scraping      |
| Lidl     | Crawlee Playwright + Docling  | PDF link discovery + Docling OCR extraction                |

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
