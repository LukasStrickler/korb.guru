# korb.guru Deployment Guide

## Architecture Overview

```
[Coolify]
  ├── Backend (FastAPI)     → port 8000
  ├── PostgreSQL 16         → port 5432
  ├── Qdrant                → port 6333
  └── (optional) Redis      → port 6379
```

Frontend is developed and deployed separately.

---

## Coolify Deployment

### 1. Repository Setup

1. Connect your GitHub repo to Coolify
2. Set the build pack to **Docker Compose**
3. Point Coolify to `docker-compose.yml` in the repo root

### 2. Environment Variables

Set these in Coolify's environment configuration:

| Variable            | Required | Description                                                                  |
| ------------------- | -------- | ---------------------------------------------------------------------------- |
| `POSTGRES_USER`     | Yes      | PostgreSQL username                                                          |
| `POSTGRES_PASSWORD` | Yes      | Strong password for PostgreSQL                                               |
| `POSTGRES_DB`       | Yes      | Database name (default: `korb_guru`)                                         |
| `DATABASE_URL`      | Yes      | Full connection string (must match PG credentials)                           |
| `JWT_SECRET_KEY`    | Yes      | Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `APIFY_TOKEN`       | Yes      | Your Apify API token for crawlers + LLM categorization                       |
| `QDRANT_MODE`       | No       | `docker` (default) for compose setup                                         |
| `QDRANT_HOST`       | No       | `qdrant` (default, matches compose service name)                             |
| `CORS_ORIGINS`      | Yes      | Comma-separated list of allowed frontend origins                             |
| `LOG_LEVEL`         | No       | `INFO` (default), `DEBUG`, `WARNING`                                         |

For Qdrant Cloud (instead of local):

```
QDRANT_MODE=cloud
QDRANT_URL=https://xxx.cloud.qdrant.io:6333
QDRANT_API_KEY=your-key
```

### 3. Production docker-compose Override

Create `docker-compose.prod.yml` for production:

```yaml
services:
  backend:
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    volumes: [] # Remove dev volume mount
    restart: unless-stopped

  postgres:
    restart: unless-stopped

  qdrant:
    restart: unless-stopped
```

### 4. HTTPS / Reverse Proxy

Coolify handles HTTPS automatically via Traefik:

- Set your domain in Coolify's service settings
- Coolify auto-provisions Let's Encrypt certificates
- No additional HTTPS configuration needed

For the frontend, set `CORS_ORIGINS` to your actual frontend domain:

```
CORS_ORIGINS=["https://app.korb.guru"]
```

---

## External Services to Connect

### Redis (Caching & Rate Limiting)

Currently rate limiting uses in-memory storage (resets on restart). For production:

1. Add Redis under `services:` in `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  volumes:
    - redisdata:/data
```

2. Update rate limiter in `main.py`:

```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address, storage_uri="redis://redis:6379")
```

> **Note:** The limiter instance must be stored on `app.state.limiter` so that
> SlowAPI's exception handler and middleware can find it at runtime.

3. Use Redis for caching frequently accessed data (product search results, recipe recommendations).

### Background Task Workers (Celery or ARQ)

For long-running tasks like:

- Crawling retailers (Apify actor runs)
- LLM-based recipe categorization
- Generating weekly grocery lists on schedule
- Sending notification digests

Recommended: **ARQ** (async Redis queue, lightweight):

1. Add `arq` to `apps/api/pyproject.toml`
2. Create `apps/api/src/workers.py` with task definitions
3. Add a worker service under `services:` in `docker-compose.yml`:

```yaml
worker:
  build: ./apps/api
  command: arq src.workers.WorkerSettings
  env_file: .env
  depends_on:
    - redis
    - postgres
```

### WebSocket (Real-time Chat)

The current chat (`/api/v1/messages`) is REST-based (polling). For real-time:

1. Add a WebSocket endpoint in `messages.py`:

```python
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

@router.websocket("/ws/{household_id}")
async def chat_ws(websocket: WebSocket, household_id: uuid.UUID):
    await websocket.accept()
    # Broadcast messages to all connected household members
```

2. Use Redis Pub/Sub for multi-worker WebSocket broadcasting.

### Monitoring Stack

The app already exposes **Prometheus metrics** at `/metrics`. To visualize:

1. Add Prometheus + Grafana to compose or connect existing:

```yaml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  environment:
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:?Set a secure Grafana admin password}
```

2. `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: korb-backend
    static_configs:
      - targets: ["backend:8000"]
```

3. Import a FastAPI Grafana dashboard (ID: 16110).

### CI/CD Pipeline

Recommended GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install uv && uv pip install --system --no-cache ./apps/api
      - run: cd backend && python -m pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Coolify Webhook
        run: curl -X POST "${{ secrets.COOLIFY_WEBHOOK_URL }}"
```

### Database Backups

Since the app uses greenfield `create_all()` (no migrations), backups are critical:

1. **Coolify built-in**: Enable automatic PostgreSQL backups in Coolify's database settings
2. **Manual/cron**: Add a backup service:

```yaml
pg-backup:
  image: prodrigestivill/postgres-backup-local
  environment:
    POSTGRES_HOST: postgres
    POSTGRES_DB: ${POSTGRES_DB}
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    SCHEDULE: "@daily"
    BACKUP_KEEP_DAYS: 14
  volumes:
    - ./backups:/backups
```

---

## Health Checks

- **Backend**: `GET /health` returns `{"status": "ok"}`
- **Metrics**: `GET /metrics` returns Prometheus format
- **PostgreSQL**: Compose healthcheck via `pg_isready`
- **Qdrant**: Compose healthcheck via `/healthz`

Configure Coolify's health check to hit `/health` on port 8000.

---

## Security Checklist

- [ ] Set a strong `JWT_SECRET_KEY` (never leave empty in production)
- [ ] Set a strong `POSTGRES_PASSWORD`
- [ ] Restrict `CORS_ORIGINS` to your actual frontend domain(s)
- [ ] Keep `APIFY_TOKEN` secret
- [ ] Set `LOG_LEVEL=WARNING` in production (reduces noise)
- [ ] Enable Coolify's built-in firewall rules (only expose ports 80/443)
- [ ] Review rate limiting thresholds for your traffic (default: 60 req/min global, 5/min register, 10/min login)
