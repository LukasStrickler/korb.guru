# Apify Crawler

Scrapes Swiss grocery retailer data using [Apify](https://apify.com/) platform with [Crawlee](https://crawlee.dev/python/) + [Docling](https://docling-project.github.io/docling/).

## Setup

```bash
pip install -r requirements.txt
export APIFY_TOKEN=your-token
```

## Usage

```bash
# Run all retailers
python -m crawler.apify.orchestrator

# Single retailer
python -m crawler.apify.orchestrator --chain=aldi

# With Qdrant ingestion
python -m crawler.apify.orchestrator --ingest

# Preview what would run
python -m crawler.apify.orchestrator --dry-run
```

## Custom Actor

All 5 retailers are handled by our custom `korb-guru/swiss-grocery-scraper` Actor:

| Retailer | Web Scraping                 | PDF Extraction   |
| -------- | ---------------------------- | ---------------- |
| Aldi     | httpx (PDF download)         | Docling          |
| Migros   | Crawlee PlaywrightCrawler    | Docling (Issuu)  |
| Coop     | Crawlee PlaywrightCrawler    | Docling (ePaper) |
| Denner   | Crawlee BeautifulSoupCrawler | Docling (Issuu)  |
| Lidl     | Crawlee PlaywrightCrawler    | Docling          |

## Publishing the Custom Actor

```bash
cd actors/swiss-grocery-scraper
npm install -g apify-cli
apify login --token YOUR_TOKEN
apify push
```

See [docs/crawler-apify.md](../../docs/crawler-apify.md) for full documentation.
