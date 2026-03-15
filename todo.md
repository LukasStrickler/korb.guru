# korb.guru — Aktuelle Aufgaben

Stand: 2026-03-15

## Erledigt

- [x] Scraper-Datenqualität: Junk-Filter in `pdf_extract.py`, `routes.py`, `transform.py`
- [x] Google Maps Store Discovery: 102 Stores ingested (Migros, Coop, Aldi, Lidl, Denner)
- [x] Block-Extraktor für Aldi PDFs (Artikelnummer-Anker, 146 Produkte aus KW11-PDF)
- [x] Block-Extraktor für Lidl PDFs (7-stellige Artikelnummern, 129 Produkte)
- [x] Doubled-Character-Fix für pdfplumber-OCR-Artefakte
- [x] Normalisierung: `_is_junk_name()` mit ~15 Filterregeln
- [x] PDFs heruntergeladen: Aldi KW11 (21MB), Lidl KW11 (38MB), 5 Coop-Seiten
- [x] Denner HTML analysiert: 466 Produkte auf denner.ch verfügbar

## In Arbeit

- [ ] Lokale Extraktion vs. Apify Actor Ergebnisse vergleichen
  - Aldi lokal: 146 Produkte (Block-Extraktor) vs. Actor: ~5 (alt, line-based)
  - Lidl lokal: 129 Produkte (Block-Extraktor) vs. Actor: ~150 (API-basiert)
  - Verbesserter Actor muss noch deployed werden

## Offen

### Scraper & Extraktion

- [ ] Actor auf Apify deployen mit allen Verbesserungen
- [ ] Coop: Bessere Datenquelle finden (ePaper = Zeitungswerbung, coop.ch blockt mit Cloudflare)
- [ ] Migros: Playwright-Rendering nötig (403 bei direktem HTTP-Zugriff)
- [ ] Denner: HTML-Scraper in Actor integrieren (denner.ch/aktionen ist zugänglich)
- [ ] Re-run full pipeline nach Actor-Deployment und Ergebnisse evaluieren

### Backend Migration (Plan vorhanden)

- [ ] `apps/api/src/services/llm_service.py` — Dual-Provider (Apify OpenRouter + eigener Key als Fallback)
- [ ] `apps/api/src/config.py` — `apify_token` hinzufügen
- [ ] Alembic-Migration: 22 Zürcher Stores seeden
- [ ] `docker-compose.yml` — Backend-Service entfernen
- [ ] `.env.template` — JWT-Settings entfernen, OPENROUTER_API_KEY hinzufügen
- [ ] `backend/` komplett löschen (durch `apps/api/` ersetzt)
- [ ] Docs aktualisieren (DEPLOYMENT.md, README.md, etc.)

### Datenqualität

- [ ] Aldi Block-Extraktor: Doppelte Produkte reduzieren (manchmal wird gleicher Artikel von 2 Seiten extrahiert)
- [ ] Lidl Block-Extraktor: x_tolerance weiter tunen, manche Produkte werden noch gemergt
- [ ] Reguläre Sortiment-Preise (nicht nur Rabatt-Aktionen) für alle 5 Retailer

## Architektur-Überblick

```
crawler/apify/
  orchestrator.py         — Actor-Runner mit Retry-Logik
  config.py               — Actor ID, Tokens, Retailer-Konfiguration
  google_maps.py          — Google Maps Store Discovery
  ingest/
    transform.py          — Normalisierung + Junk-Filter
    pipeline.py           — Embedding + Upsert in Qdrant
  actors/
    swiss-grocery-scraper/
      src/
        pdf_extract.py    — PDF-Extraktion (Block-Extraktor + pdfplumber + Docling)
        routes.py         — Per-Retailer Scraping-Handler

apps/api/                 — FastAPI Backend (async SQLAlchemy, Clerk Auth)
  src/routes/
    ingest.py             — Produkt-Ingestion Endpoint
    stores.py             — Store-Ingestion Endpoint
```

## Datenbank-Status

- PostgreSQL: 102 Stores, 374 Produkte (aus früherem Scraper-Run)
- Qdrant Cloud: Vektor-Embeddings für Produktsuche
