# Custom Crawler (SmartCart)

## Overview

SmartCart is a custom Python-based web crawler that scrapes product data and store locations from 5 major Swiss grocery retailers in the Zürich region. It is a Python port of the original `carty` Node.js codebase, rebuilt with async patterns and Qdrant integration.

## Architecture

```
crawler/smartcart/
├── main.py              # CLI orchestrator (asyncio-based)
├── config.py            # Retailers, Zürich bbox, PLZ ranges
├── scrapers/            # One scraper per retailer
│   ├── base.py          # Abstract BaseScraper
│   ├── aldi.py          # Tier 1: Scene7 CDN PDF download
│   ├── migros.py        # Tier 2: Issuu flipbook metadata
│   ├── denner.py        # Tier 2: Issuu + SSR HTML offers
│   ├── coop.py          # Tier 3: Playwright ePaper session
│   └── lidl.py          # Tier 4: Playwright JS-rendered PDF
├── locations/           # Store location scrapers
│   ├── migros.py        # Overpass API (OpenStreetMap)
│   ├── coop.py          # VST Store Finder API
│   ├── denner.py        # denner.ch API
│   └── generic.py       # Playwright for Aldi, Lidl
├── models/              # Pydantic data models
├── utils/               # Shared utilities (dates, geo, http)
└── ingest/              # Qdrant + backend API sync
```

## Retailer Strategies

| Retailer   | Method               | Source                            | Notes                                           |
| ---------- | -------------------- | --------------------------------- | ----------------------------------------------- |
| **Aldi**   | httpx + Docling      | Scene7 CDN                        | PDF download + Docling OCR extraction           |
| **Migros** | Issuu + Playwright   | Issuu (m-magazin) + aktionen HTML | Page images via Docling OCR + HTML scraping     |
| **Denner** | Issuu + httpx/BS4    | Issuu (denner-ch) + aktionen HTML | Page images via Docling OCR + SSR HTML scraping |
| **Coop**   | Playwright           | ePaper storefront                 | Session-based PDF download via API              |
| **Lidl**   | Playwright + Docling | lidl.ch                           | PDF link discovery + Docling OCR extraction     |

## Usage

```bash
cd crawler/smartcart
uv pip install --system -r pyproject.toml
playwright install chromium

# Run all scrapers
python -m crawler.smartcart.main

# Prospekt scrapers only
python -m crawler.smartcart.main --prospekte

# Location scrapers only
python -m crawler.smartcart.main --locations

# Single retailer
python -m crawler.smartcart.main --chain=aldi

# Run + ingest to Qdrant
python -m crawler.smartcart.main --ingest
```

## Data Flow

1. Scrapers extract product/prospekt data from retailer websites
2. Data is validated through Pydantic models (`ScrapedProduct`, `ScrapedProspekt`)
3. Output is saved as JSON to `output/prospekte/` and `output/locations/`
4. With `--ingest` flag: products are embedded and upserted to Qdrant's `products` collection

## Comparison to Apify Variant

| Aspect         | SmartCart (Custom)   | Apify              |
| -------------- | -------------------- | ------------------ |
| Infrastructure | Self-hosted          | Apify Cloud        |
| Cost           | Free (compute only)  | Uses Apify credits |
| Proxy rotation | Manual               | Built-in           |
| Scheduling     | Cron/manual          | Apify scheduling   |
| Maintenance    | Full control         | Actor updates      |
| Best for       | Development, testing | Production, scale  |

## Limitations

- Swiss retailer sites may block automated requests
- Playwright scrapers are slower but necessary for JS-rendered pages
- Docling OCR requires ~2-4 GB RAM for model loading (runs on CPU)
- Rate limiting should be implemented for production use
