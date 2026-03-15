# Getting Started

## Prerequisites

- Docker & Docker Compose
- Python 3.12+
- Git
- (Optional) Playwright browsers for crawler: `playwright install chromium`
- (Optional) Apify account for Apify crawler variant

## Setup

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/korb.guru.git
cd korb.guru

# Create .env from template
cp .env.template .env
```

### 2. Configure Environment

Edit `.env` with your credentials:

```env
# Required: Qdrant Cloud
QDRANT_MODE=cloud
QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
QDRANT_API_KEY=your-api-key

# Required: Change JWT secret
JWT_SECRET_KEY=your-random-secret-here

# Optional: Apify (for Apify crawler)
APIFY_TOKEN=your-apify-token
```

### 3. Start Services

```bash
docker compose up --build
```

This starts:

- **Backend** at http://localhost:8000
- **PostgreSQL** at localhost:5432
- **Qdrant** at localhost:6333 (local dev fallback)

### 4. Verify

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health
- Qdrant dashboard: http://localhost:6333/dashboard

### 5. First Steps

```bash
# Register a user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "username": "Test", "password": "secret123"}'

# Use the returned token for authenticated requests
export TOKEN="your-jwt-token"

# Create a household
curl -X POST http://localhost:8000/api/v1/households \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Household"}'
```

## Running Crawlers

### Custom Crawler (SmartCart)

```bash
cd crawler/smartcart
pip install -r requirements.txt
playwright install chromium  # for Coop, Lidl

python -m crawler.smartcart.main              # all retailers
python -m crawler.smartcart.main --chain=aldi  # single retailer
python -m crawler.smartcart.main --ingest      # + Qdrant ingestion
```

### Apify Crawler

```bash
export APIFY_TOKEN=your-token
cd crawler/apify
pip install -r requirements.txt

python -m crawler.apify.orchestrator               # all Actors
python -m crawler.apify.orchestrator --chain=aldi   # single Actor
python -m crawler.apify.orchestrator --ingest       # + Qdrant ingestion
```
