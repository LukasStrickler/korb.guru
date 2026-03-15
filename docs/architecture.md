# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        korb.guru                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────────┐     ┌───────────────────┐   │
│  │ Frontend  │────>│   Backend    │────>│    PostgreSQL      │   │
│  │ (HTML/    │<────│  (FastAPI)   │<────│    (SQLModel)      │   │
│  │  Alpine)  │     │  :8000       │     │    :5432           │   │
│  └──────────┘     └──────┬───────┘     └───────────────────┘   │
│                          │                                       │
│                          │ embed + search                        │
│                          ▼                                       │
│                   ┌──────────────┐                               │
│                   │   Qdrant     │                               │
│                   │  (Cloud or   │                               │
│                   │   Docker)    │                               │
│                   │  :6333       │                               │
│                   └──────────────┘                               │
│                          ▲                                       │
│                          │ ingest                                │
│           ┌──────────────┴──────────────┐                       │
│           │                             │                        │
│  ┌────────┴────────┐     ┌─────────────┴──────────┐            │
│  │ Custom Crawler   │     │   Apify Crawler         │            │
│  │ (smartcart/)     │     │   (apify/)              │            │
│  │ Crawlee+Docling  │     │   Crawlee+Docling       │            │
│  └─────────────────┘     └────────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Service Interactions

### Request Flow (User Search)

1. User types search query in frontend
2. Frontend sends `GET /api/v1/products/search?q=milk` to backend
3. Backend embeds query via FastEmbed (paraphrase-multilingual-MiniLM-L12-v2)
4. Backend executes hybrid search (dense + sparse) on Qdrant `products` collection
5. Qdrant returns ranked results with RRF fusion
6. Backend returns product data to frontend

### Data Ingestion Flow

1. Crawler (smartcart or apify) scrapes retailer websites
2. Raw data is normalized via Pydantic models
3. Products are embedded via FastEmbed
4. Dense + sparse vectors are upserted to Qdrant
5. Product metadata is stored in PostgreSQL

### Recommendation Flow

1. User swipes recipe (accept/reject)
2. Backend records swipe in `swipe_actions` table
3. Backend updates user's preference vector in Qdrant `user_preferences`
4. On next recommendation request, Qdrant uses preference vector + swipe history
5. Discovery API context pairs improve over time

## Technology Decisions

| Decision             | Choice                     | Reasoning                                        |
| -------------------- | -------------------------- | ------------------------------------------------ |
| Web framework        | FastAPI                    | Async, auto-docs, Pydantic integration           |
| ORM                  | SQLModel                   | Combines SQLAlchemy + Pydantic, less boilerplate |
| Vector DB            | Qdrant                     | Hybrid search, Discovery API, cloud offering     |
| Embeddings           | FastEmbed (local)          | No API cost, fast, multilingual                  |
| Auth                 | JWT                        | Stateless, simple for hackathon                  |
| Web crawling         | Crawlee (Playwright + BS4) | Apify-native, async, built-in proxy rotation     |
| PDF/Image extraction | Docling                    | ML-based layout analysis, multilingual OCR       |
| Package management   | uv + pyproject.toml        | Fast installs, modern Python packaging           |
