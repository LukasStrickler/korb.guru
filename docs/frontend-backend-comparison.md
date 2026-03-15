# Frontend / Backend Feature-Vergleich

> Stand: 2026-03-11 | Branch: `backend`

## Architektur-Überblick

| Komponente                          | Technologie                                     | Status                                            |
| ----------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| **Apps/API (apps/api/)**            | FastAPI + SQLAlchemy async + Clerk JWT + Qdrant | **54 Routen** — alle Backend-Endpoints integriert |
| **Backend (backend/)**              | FastAPI + SQLModel + Qdrant (Original)          | Quellcode — in apps/api/ integriert               |
| **Convex (apps/convex/)**           | Convex Realtime DB                              | Users + Recipes CRUD                              |
| **Mobile (apps/mobile/)**           | Expo + React Native + Clerk                     | Auth + Home Screen                                |
| **Contracts (packages/contracts/)** | TypeScript Types                                | Domain-Typen definiert, nicht angebunden          |

---

## 1. Integration abgeschlossen: backend/ → apps/api/

Alle 37+ Endpoints aus `backend/` wurden in `apps/api/` integriert. Die Geschäftslogik stammt aus `backend/`, wurde aber an die `apps/api/`-Umgebung angepasst:

- **Auth:** Clerk JWT (statt eigenes JWT mit python-jose/bcrypt)
- **ORM:** SQLAlchemy 2.0 async mit `Mapped[]` + `mapped_column()` (statt SQLModel sync)
- **DB-Sessions:** `AsyncSession` mit `await session.execute()` (statt `session.exec()`)
- **UUIDs:** Alle Primary Keys sind UUID (statt Integer)
- **User-Modell:** `clerk_id` statt `hashed_password`, Auto-Create bei erstem API-Call

### Integrierte Module

| Modul            | Dateien                   | Beschreibung                                                                                                 |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Models**       | 11 neue + 1 umgeschrieben | Household, Recipe, MealPlan, Grocery, Budget, Product, Store, Message, Notification, Poll + User (rewritten) |
| **Schemas**      | 11 neue Pydantic-Schemas  | Auth, Household, Recipe, MealPlan, Budget, Grocery, Product, Poll, Message, Route, Receipt                   |
| **Services**     | 6 neue Service-Module     | Embedding, Recipe, Discovery, Product, Grocery, Route                                                        |
| **Routes**       | 11 neue + 1 umgeschrieben | Alle Domain-Router + me.py rewritten                                                                         |
| **Qdrant**       | 3 neue Dateien            | Client (lazy singleton), Collections (products/recipes/user_preferences), **init**                           |
| **Config**       | 1 neue Datei              | Settings für Qdrant-Modus, Embedding-Provider                                                                |
| **Dependencies** | 1 neue Datei              | Clerk-Auth, Pagination, Household-Scoping                                                                    |

### Alle 54 Routen in apps/api/

| Bereich       | Endpoints                                                                                                                            | Prefix                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| Auth/User     | `GET/PATCH/DELETE /me`, `GET/POST health-streak/*`                                                                                   | `/api/v1/users`         |
| Household     | `POST /`, `POST /join`, `GET /`, `GET /members`                                                                                      | `/api/v1/households`    |
| Rezepte       | `POST /`, `GET /`, `GET /search`, `GET /discover`, `GET /recommendations`, `GET /discovery-metrics`, `POST /{id}/swipe`, `GET /{id}` | `/api/v1/recipes`       |
| Meal Planning | `POST /`, `GET /`, `DELETE /{id}`, `POST /generate-grocery-list`                                                                     | `/api/v1/meal-plans`    |
| Einkaufsliste | `GET /lists`, `PATCH /items/bulk`, `PATCH /items/{id}`, `POST /lists/{id}/items/bulk`                                                | `/api/v1/grocery`       |
| Produkte      | `GET /search`, `GET /compare`, `GET /deals`                                                                                          | `/api/v1/products`      |
| Budget        | `GET/PATCH /settings`, `POST/GET /entries`, `GET /weekly-summary`                                                                    | `/api/v1/budget`        |
| Chat          | `GET /`, `POST /`                                                                                                                    | `/api/v1/messages`      |
| Polls         | `POST /`, `POST /{id}/vote`, `GET /active`                                                                                           | `/api/v1/polls`         |
| Route         | `POST /optimize`, `GET /stores`                                                                                                      | `/api/v1/route`         |
| Notifications | `GET /`, `PATCH /{id}`, `DELETE /{id}`                                                                                               | `/api/v1/notifications` |
| Receipts      | `POST /scan`, `POST /auto-refill`                                                                                                    | `/api/v1/receipts`      |
| Legacy        | `GET /health`, `GET /hello`, `POST /examples`, `POST /ingest`                                                                        | (kein Prefix)           |

---

## 2. Frontend-Funktionen die im Backend FEHLEN

| Frontend-Feature                              | Technologie          | Backend-Status                                                    |
| --------------------------------------------- | -------------------- | ----------------------------------------------------------------- |
| **Convex Users (realtime sync)**              | Convex               | apps/api nutzt PostgreSQL — Sync via Clerk Webhooks empfohlen     |
| **Convex Recipes CRUD**                       | Convex               | apps/api hat eigene Recipe-API — Migration auf apps/api empfohlen |
| **Handle-System (korb.guru/add/xyz)**         | Convex + Expo Router | Fehlt in apps/api                                                 |
| **Deep-Links (go/recipe/{id}, go/list/{id})** | Expo Router (Stub)   | apps/api hat keine Deep-Link Resolution                           |
| **PostHog Analytics**                         | PostHog SDK          | PostHog Server-seitig in apps/api vorhanden                       |
| **Offline-Banner (NetInfo)**                  | React Native         | Kein Backend-Feature nötig                                        |
| **Storybook (Component Testing)**             | Storybook            | Kein Backend-Feature nötig                                        |

---

## 3. Verbleibende Duplikationen

### User-Daten leben an 3 Orten:

1. **Clerk** — Auth-Provider (Email, Password, Session)
2. **Convex `users` Tabelle** — Handle, Name, Email (sync via `syncFromClerk`)
3. **apps/api PostgreSQL `users` Tabelle** — clerk_id, Email, Username, Avatar, Household, Streak

**Lösung:** Clerk Webhooks an apps/api anbinden, Convex User-Tabelle langfristig auf PostgreSQL migrieren.

### Rezepte leben an 2 Orten:

1. **Convex `recipes` Tabelle** — Einfaches CRUD (title, ingredients[], instructions[])
2. **apps/api PostgreSQL `recipes` + Qdrant** — Volles CRUD + Embedding + Semantic Search + Discovery

**Lösung:** Frontend auf apps/api Recipe-Endpoints umstellen, Convex-Rezepte migrieren.

### Auth-System ist jetzt kompatibel:

- **Frontend:** Clerk (OAuth/MFA, Session Tokens)
- **apps/api:** Clerk JWT Validation (integriert!)

---

## 4. Nächste Schritte

### Sofort nötig:

1. **Alembic Migration anwenden** — Die Migration für alle 16 Tabellen existiert bereits, anwenden mit `pnpm db:migrate`
2. **Tests aktualisieren** — Bestehende Tests nutzen altes User-Modell (id: int), auf UUID umstellen
3. **Frontend-Screens bauen** — Rezept-Swipe, Meal-Plan, Einkaufsliste (mindestens 3 für Demo)

### Empfohlen:

1. **Convex → PostgreSQL Migration** für Rezepte (Qdrant-Integration nur in apps/api)
2. **Clerk Webhooks** an apps/api anbinden (User-Sync)
3. **Frontend alle Endpoints anbinden** — Mobile App nutzt apps/api statt Convex für persistente Daten
4. **Qdrant im Docker Compose** einrichten für lokale Entwicklung

---

## 5. Coverage-Matrix

| Feature-Bereich    | apps/api                  | Frontend             | Contracts               | Integriert?                          |
| ------------------ | ------------------------- | -------------------- | ----------------------- | ------------------------------------ |
| Auth               | ✅ Clerk JWT              | ✅ Clerk             | —                       | ✅ Kompatibel                        |
| User Profile       | ✅ (5 Endpoints)          | ⚠️ (nur Name+Handle) | ✅ (UserPreferences)    | ⚠️ API bereit, kein UI               |
| Household          | ✅ (4 Endpoints)          | ❌                   | —                       | ⚠️ API bereit, kein UI               |
| Rezepte CRUD       | ✅ (8 Endpoints + Qdrant) | ⚠️ (Convex)          | ✅ (Recipe Types)       | ⚠️ API bereit, Frontend nutzt Convex |
| Semantic Search    | ✅ (Qdrant)               | ❌                   | —                       | ⚠️ API bereit, kein UI               |
| Recipe Discovery   | ✅ (Context Pairs)        | ❌                   | —                       | ⚠️ API bereit, kein UI               |
| Meal Planning      | ✅ (4 Endpoints)          | ❌                   | ✅ (MealPlan Types)     | ⚠️ API bereit, kein UI               |
| Einkaufsliste      | ✅ (4 Endpoints)          | ❌                   | ✅ (ShoppingList Types) | ⚠️ API bereit, kein UI               |
| Produkt-Suche      | ✅ (3 Endpoints)          | ❌                   | —                       | ⚠️ API bereit, kein UI               |
| Budget             | ✅ (5 Endpoints)          | ❌                   | —                       | ⚠️ API bereit, kein UI               |
| Chat/Messages      | ✅ (2 Endpoints)          | ❌                   | —                       | ⚠️ API bereit, kein UI               |
| Polls              | ✅ (3 Endpoints)          | ❌                   | —                       | ⚠️ API bereit, kein UI               |
| Route Optimization | ✅ (2 Endpoints)          | ❌                   | —                       | ⚠️ API bereit, kein UI               |
| Notifications      | ✅ (3 Endpoints)          | ❌                   | —                       | ⚠️ API bereit, kein UI               |
| Receipts           | ✅ (2 Endpoints)          | ❌                   | —                       | ⚠️ API bereit, kein UI               |
| Analytics          | ✅ (PostHog)              | ✅ (PostHog)         | —                       | ✅                                   |
| Deep Links         | ❌                        | ⚠️ (Stub)            | —                       | ❌                                   |
| Handle System      | ❌                        | ✅ (Convex)          | —                       | ❌                                   |

**Legende:** ✅ Vollständig | ⚠️ Teilweise (API bereit, Frontend fehlt) | ❌ Fehlt
