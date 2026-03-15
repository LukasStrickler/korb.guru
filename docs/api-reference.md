# API Reference

The full interactive API documentation is available at **http://localhost:8000/docs** (Swagger UI) when the backend is running.

## Base URL

All endpoints are prefixed with `/api/v1`.

## Authentication

Most endpoints require a JWT Bearer token. Obtain one via `/auth/register` or `/auth/login`.

```
Authorization: Bearer <token>
```

## Endpoints Summary

### Auth

- `POST /auth/register` - Create account, returns JWT
- `POST /auth/login` - Login, returns JWT
- `GET /auth/me` - Get current user profile

### Households

- `POST /households` - Create a household
- `POST /households/join` - Join via invite code
- `GET /households` - Get current household
- `GET /households/members` - List household members

### Recipes

- `POST /recipes` - Create recipe (auto-embeds to Qdrant)
- `GET /recipes` - List household recipes
- `GET /recipes/{id}` - Get recipe details
- `GET /recipes/search?q=` - Semantic search via Qdrant
- `GET /recipes/discover` - Discovery API recommendations
- `GET /recipes/recommendations` - Personalized recommendations
- `POST /recipes/{id}/swipe` - Record accept/reject (updates preferences)

### Meal Plans

- `POST /meal-plans` - Add recipe to plan
- `GET /meal-plans?start=&end=` - Get plans for date range
- `DELETE /meal-plans/{id}` - Remove from plan
- `POST /meal-plans/generate-grocery-list?start=&end=` - Generate shopping list

### Grocery

- `GET /grocery/lists` - Get all grocery lists
- `PATCH /grocery/items/{id}` - Check/uncheck item

### Messages

- `GET /messages` - Get household chat messages
- `POST /messages` - Send a message

### Polls

- `POST /polls` - Create meal poll
- `POST /polls/{id}/vote` - Vote yes/no
- `GET /polls/active` - Get active polls

### Budget

- `GET /budget/settings` - Get budget settings
- `PATCH /budget/settings` - Update weekly limit
- `POST /budget/entries` - Record expense
- `GET /budget/entries` - List expenses
- `GET /budget/weekly-summary` - Weekly spending summary

### Products

- `GET /products/search?q=` - Hybrid search (dense + BM25)
- `GET /products/compare?ingredient=` - Price comparison
- `GET /products/deals` - Top discounted products

### Route

- `POST /route/optimize` - Calculate optimal shopping route
- `GET /route/stores` - List all known stores

### Notifications

- `GET /notifications` - Get user notifications
- `PATCH /notifications/{id}` - Mark as read
- `DELETE /notifications/{id}` - Delete notification

### Receipts

- `POST /receipts/scan` - Placeholder for OCR integration
