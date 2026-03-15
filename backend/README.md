# korb.guru Backend

AI-powered meal planning & smart grocery shopping backend for households in Zürich.

## Tech Stack

- **Python 3.12** + **FastAPI**
- **SQLModel** (SQLAlchemy + Pydantic)
- **PostgreSQL 16** (via Docker)
- **Qdrant** (vector database - cloud or local)
- **FastEmbed** (local embeddings via paraphrase-multilingual-MiniLM-L12-v2)
- **JWT** authentication

## Quick Start

```bash
# 1. Copy env template
cp .env.template .env
# Edit .env with your Qdrant Cloud credentials

# 2. Start all services
docker compose up --build

# 3. Open API docs
# http://localhost:8000/docs
```

## Project Structure

```
backend/app/
├── main.py              # FastAPI app, lifespan, CORS
├── config.py            # Pydantic Settings (env-based)
├── database.py          # SQLModel engine + session
├── dependencies.py      # Auth dependencies
├── models/              # SQLModel table models
│   ├── user.py, household.py, recipe.py
│   ├── meal_plan.py, grocery.py, message.py
│   ├── poll.py, budget.py, store.py
│   ├── notification.py, product.py
├── schemas/             # Pydantic request/response
├── routers/             # API endpoints
│   ├── auth.py          # register, login, me
│   ├── households.py    # create, join, members
│   ├── recipes.py       # CRUD + search + swipe + discover
│   ├── meal_plans.py    # planning + grocery list generation
│   ├── grocery.py       # lists + item management
│   ├── messages.py      # household chat
│   ├── polls.py         # meal voting
│   ├── budget.py        # tracking + weekly summary
│   ├── products.py      # hybrid search + compare + deals
│   ├── route.py         # store route optimization
│   ├── notifications.py
│   └── receipts.py      # placeholder for OCR
├── services/            # Business logic
│   ├── auth_service.py
│   ├── embedding_service.py
│   ├── recipe_service.py
│   ├── product_service.py
│   ├── discovery_service.py
│   ├── grocery_service.py
│   ├── route_service.py
│   ├── poll_service.py
│   └── llm_service.py
└── qdrant/              # Vector DB integration
    ├── client.py        # Switchable client (cloud/docker/local/memory)
    └── collections.py   # 3 collections with hybrid search
```

## API Endpoints

All endpoints are under `/api/v1`. Full interactive docs at `/docs` (Swagger UI).

| Group      | Endpoints                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Auth       | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`                                                               |
| Households | `POST /households`, `POST /households/join`, `GET /households/members`                                                  |
| Recipes    | CRUD + `GET /recipes/search?q=` + `GET /recipes/discover` + `POST /recipes/{id}/swipe` + `GET /recipes/recommendations` |
| Meal Plans | `GET/POST/DELETE /meal-plans`, `POST /meal-plans/generate-grocery-list`                                                 |
| Grocery    | `GET /grocery/lists`, `PATCH /grocery/items/{id}`                                                                       |
| Messages   | `GET/POST /messages`                                                                                                    |
| Polls      | `POST /polls`, `POST /polls/{id}/vote`, `GET /polls/active`                                                             |
| Budget     | `GET/PATCH /budget/settings`, `POST/GET /budget/entries`, `GET /budget/weekly-summary`                                  |
| Products   | `GET /products/search?q=`, `GET /products/compare?ingredient=`, `GET /products/deals`                                   |
| Route      | `POST /route/optimize`, `GET /route/stores`                                                                             |

## Qdrant Collections

| Collection         | Vectors                      | Use Case                               |
| ------------------ | ---------------------------- | -------------------------------------- |
| `products`         | Dense (384d) + Sparse (BM25) | Hybrid product search with RRF fusion  |
| `recipes`          | Dense (384d)                 | Semantic recipe search + Discovery API |
| `user_preferences` | Dense (384d)                 | Personalized recommendations           |

## Development

```bash
# Run without Docker
uv sync
uv run uvicorn app.main:app --reload --port 8000

# Database tables are auto-created on startup via SQLModel.metadata.create_all()
```
