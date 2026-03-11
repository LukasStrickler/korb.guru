# Architecture - Expo FastAPI Convex Monorepo

## Environment Configuration

### Key Patterns Learned

1. **Expo Client-Exposed Variables**: Use `EXPO_PUBLIC_` prefix for variables that must be accessible on the client-side (mobile app). These are embedded at build time and visible in the JavaScript bundle.

2. **Server-Only Variables**: Variables in `apps/api/.env` are never exposed to the client. Use `dotenv`-based loading (python-dotenv) in FastAPI startup.

3. **Convex URL Patterns**:
   - **Public URL**: For client-side access (EXPO_PUBLIC_CONVEX_URL)
   - **Deployment**: For server-side operations (CONVEX_DEPLOYMENT)
   - Development URL format: `http://localhost:3000`

4. **Port Configuration**:
   - Mobile (Expo): 8081
   - API (FastAPI): 8000
   - Convex: 3000 (dev)

5. **Scraper Isolation**: Scraper app uses separate environment variables (SCRAPER_CONFIG, OUTPUT_FORMAT, etc.) to maintain complete independence from the mobile and API services.

### Not Yet Implemented (Future Work)

- [ ] `.gitignore` entry for all `.env` files (already excludes some patterns)
- [ ] Documentation in README.md pointing to env files
- [ ] Helper scripts to generate SECRET_KEY values
- [ ] Pre-commit hook to verify no real secrets are committed
- [ ] `.env.example` README explaining variable purposes
- [ ] CI/CD env injection strategy for deployments

## Overview

This monorepo uses pnpm + Turbo as the orchestrator with a hybrid architecture combining:

- Expo for the UI (React Native)
- Convex for realtime/collaborative features
- FastAPI for heavy compute/integrations
- Separate scraper app for Python-based crawling

## Tech Stack

### Monorepo Orchestration

- **pnpm**: Package manager with strict dependency management
- **Turbo**: Build system and task runner for efficient monorepo workflows

### Applications

#### apps/mobile (Expo)

- React Native application for the UI
- No platform-specific code (web support for development)
- Uses Expo SDK for development and production

#### apps/scraper (Python)

- Separate Python application for web scraping
- Uses uv for fast Python package management and execution
- Decoupled from mobile app logic

### Backend Services

#### Convex (Realtime/Collaborative)

- Handles realtime features and collaborative data
- Document storage and subscriptions
- Serverless function execution for state changes

#### FastAPI (Heavy Compute/Integrations)

- Handles heavy computation tasks
- External API integrations
- Background job processing

## Ownership Boundaries

### Mobile Team

- `apps/mobile/` - All frontend code
- UI/UX implementation
- State management via Convex
- API communication layer

### Backend Team

- `apps/scraper/` - Python scraping logic
- `apps/convex/` - Realtime business logic
- `apps/api/` - FastAPI server and integrations

### Shared Infrastructure

- `turbo.json` - Build configuration
- `.github/` - CI/CD workflows
- `packages/` - Shared utilities

## Guardrails

### MUST NOT DO (Architectural Constraints)

1. **No Real Product Features**
   - Initial scope is infrastructure-only
   - No e-commerce functionality
   - Clerk auth is part of the scaffold (see guardrail #2)
   - No payment processing
   - No production database schemas

2. **No Custom Auth Implementation**
   - Clerk + JWT is already part of the scaffold (see `.docs/guides/authentication.md`)
   - No custom OAuth providers (use Clerk's OAuth integrations)
   - No alternative auth systems (stick with Clerk for consistency)
   - No custom JWT handling (use the existing `require_clerk_auth` in FastAPI and `ctx.auth` in Convex)

3. **No Production Infrastructure**
   - No cloud deployment configurations
   - No production database migrations
   - No production API keys or secrets
   - No AWS/GCP/Azure integration

4. **No External Dependencies**
   - No paid APIs or services
   - No real data sources
   - No email/SMS providers
   - No push notification services

5. **No Multi-tenant Architecture**
   - Single application scope only
   - No tenant isolation
   - No multi-tenancy patterns

### Development Guidelines

- **Stack Constraints**: Only use specified technologies
- **Scope Constraints**: Stay within infrastructure setup
- **Testing Constraints**: Support unit, integration, component, and E2E (Maestro) tests; keep flaky E2E cases quarantined
- **Documentation**: Keep inline comments minimal, prefer this file

## Frozen Defaults

These architectural decisions are locked and should not be changed without explicit approval:

1. **Monorepo Structure**: Root with pnpm workspaces
2. **Package Manager**: pnpm (not npm or yarn)
3. **Build System**: Turbo (not NX or pnp)
4. **UI Framework**: Expo (not React Native CLI or generic React)
5. **Backend Split**: Convex for realtime, FastAPI for compute
6. **Scraper**: Separate Python app with uv

## Current Scope

### In Scope

- Monorepo setup and configuration
- Basic project scaffolding
- Build pipeline verification
- Local development environment setup

### Out of Scope

- Product features
- Real user data
- Authentication
- Deployment infrastructure
- External API integrations
- Performance optimization
- Testing suites
- Documentation generation

## Environment Configuration

### Port Assignments

| Service                   | Port | Protocol | Description                              |
| ------------------------- | ---- | -------- | ---------------------------------------- |
| **Mobile (Expo)**         | 8081 | HTTP     | Development server for Expo/React Native |
| **API (FastAPI)**         | 8000 | HTTP     | REST API server                          |
| **Convex**                | 3000 | HTTP     | Development Convex deployment            |
| **Database (PostgreSQL)** | 5432 | TCP      | PostgreSQL database                      |

### Environment File Structure

#### Root `.env`

- General monorepo configuration
- Node.js version settings
- Optional shared settings

#### `apps/mobile/.env` (Public Variables)

These variables are exposed to the client and use the `EXPO_PUBLIC_` prefix:

- **`EXPO_PUBLIC_CONVEX_URL`** - Publicly accessible Convex deployment URL
- **`EXPO_PUBLIC_API_BASE_URL`** - Base URL for API requests (http://localhost:8000 in dev)
- **`EXPO_PUBLIC_API_KEY`** - Optional API key for client auth (placeholder)
- **`EXPO_PUBLIC_ENABLE_ANALYTICS`** - Feature flag for analytics (default: false)
- **`EXPO_PUBLIC_DEBUG_MODE`** - Debug mode for the app (default: true)

#### `apps/api/.env` (Server-Only Variables)

These variables are never exposed to the client and are server-only:

- **`DATABASE_URL`** - PostgreSQL connection string (placeholder)
- **`SECRET_KEY`** - JWT tokens, session management (generate with python -c "import secrets; print(secrets.token_urlsafe(32))")
- **`CONVEX_DEPLOYMENT`** - Server-side Convex deployment configuration
- **`CORS_ORIGINS`** - Comma-separated list of allowed origins
- **`LOG_LEVEL`** - Logging level (DEBUG, INFO, WARNING, ERROR)
- **`RATE_LIMIT_ENABLED`** - Enable rate limiting (default: true)
- **`RATE_LIMIT_PER_MINUTE`** - Rate limit threshold (default: 60)

#### `apps/scraper/.env` (Scraper Configuration)

These variables control scraper behavior:

- **`SCRAPER_CONFIG`** - JSON format configuration (user_agent, headless, timeout, retry_attempts, proxy)
- **`OUTPUT_FORMAT`** - Output format: json, csv, or xml
- **`OUTPUT_DIR`** - Directory for scraped data output
- **`SCRAPER_DELAY`** - Delay between requests (default: 1000ms)
- **`SCRAPER_MAX_PAGES`** - Maximum pages to scrape (default: 10)
- **`SCRAPER_FILTER_ENABLED`** - Enable content filtering (default: true)
- **`SCRAPER_LOG_LEVEL`** - Scraper logging level

### Environment Ownership

| App         | Environment Variables                                                                                                       | Exposure Level                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Mobile**  | EXPO_PUBLIC_CONVEX_URL, EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_API_KEY, EXPO_PUBLIC_ENABLE_ANALYTICS, EXPO_PUBLIC_DEBUG_MODE | Client-visible (public)                       |
| **API**     | DATABASE_URL, SECRET_KEY, CONVEX_DEPLOYMENT, CORS_ORIGINS, LOG_LEVEL, RATE_LIMIT_ENABLED, RATE_LIMIT_PER_MINUTE             | Server-only (never exposed to client)         |
| **Scraper** | SCRAPER_CONFIG, OUTPUT_FORMAT, OUTPUT_DIR, SCRAPER_DELAY, SCRAPER_MAX_PAGES, SCRAPER_FILTER_ENABLED, SCRAPER_LOG_LEVEL      | Server-only (independent from other services) |
| **Root**    | NODE_ENV, NODE_VERSION, MONOREPO_LOG_LEVEL                                                                                  | Monorepo-wide settings                        |

## Contracts Package

### Structure

```
packages/contracts/
├── package.json          # @korb/contracts
├── tsconfig.json         # Strict TypeScript config
└── src/
    ├── index.ts          # Main exports
    ├── types/            # Authored domain types
    │   ├── common.ts     # Base types (Id, BaseEntity, Pagination)
    │   ├── user.ts       # User domain
    │   ├── recipe.ts     # Recipe domain
    │   └── meal-plan.ts  # MealPlan domain
    └── generated/        # Auto-generated from OpenAPI (placeholder)
        └── index.ts
```

### Key Patterns

1. **Authored vs Generated Types**: Clear separation between hand-crafted domain types (`src/types/`) and auto-generated OpenAPI types (`src/generated/`)

2. **Branded IDs**: `Id<T>` type prevents mixing different entity IDs at compile time

3. **Entity Base**: `BaseEntity` provides common `id`, `createdAt`, `updatedAt` fields

4. **Input/Output Types**: Separate types for create/update operations (e.g., `CreateUserInput`, `UpdateUserInput`)

5. **Result Type**: `Result<T, E>` for operations that can fail without throwing

### Domain Types Created

- **User**: Email, displayName, preferences (dietary restrictions, serving size, cuisines)
- **Recipe**: Title, ingredients, steps, metadata (prep/cook time, servings, difficulty)
- **MealPlan**: Household-scoped meal planning with MealEntry items

### Integration Points

- Mobile app imports types for UI components
- FastAPI generates OpenAPI schema that maps to these contracts
- Convex schema should align with these contracts (but may differ internally)

### Build

- Uses `tsup` for building (CJS + ESM + d.ts)
- TypeScript strict mode enabled
- `noUncheckedIndexedAccess` for safer array access
