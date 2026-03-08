# Architecture - Expo FastAPI Convex Monorepo

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
- `convex/` - Realtime business logic
- `api/` - FastAPI server and integrations

### Shared Infrastructure
- `turbo.json` - Build configuration
- `.github/` - CI/CD workflows
- `packages/` - Shared utilities

## Guardrails

### MUST NOT DO (Architectural Constraints)

1. **No Real Product Features**
   - Initial scope is infrastructure-only
   - No e-commerce functionality
   - No user authentication
   - No payment processing
   - No production database schemas

2. **No Auth Implementation**
   - Development-only authentication (if any)
   - No OAuth flows
   - No JWT implementation
   - No role-based access control

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
- **Testing Constraints**: Basic integration tests only, no E2E
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
