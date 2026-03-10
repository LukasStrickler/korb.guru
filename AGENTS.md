# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-09
**Commit:** 1fd8240
**Branch:** expo-monorepo-setup-koiu

## OVERVIEW

Korb Guru — meal planning and shared shopping. Hybrid monorepo: Expo mobile, Next.js website, Convex realtime backend, FastAPI compute backend, Python scraper. Single source of API types via OpenAPI → TypeScript codegen.

## AGENT ONBOARDING

Start here, then drill down as needed.

| Step | File                             | Purpose                                            |
| ---- | -------------------------------- | -------------------------------------------------- |
| 1    | **This file** (root `AGENTS.md`) | Global conventions, structure, commands            |
| 2    | `.docs/README.md`                | Documentation index and guides                     |
| 3    | Package `AGENTS.md`              | Package-specific rules (mobile, api, convex, etc.) |
| 4    | `.docs/guides/<topic>.md`        | Deep dives (auth, testing, contracts)              |

**When working on:**

- Mobile UI → Read `apps/mobile/AGENTS.md` after this file
- API routes → Read `apps/api/AGENTS.md` after this file
- Convex functions → Read `apps/convex/AGENTS.md` after this file
- Shared types → Read `packages/contracts/AGENTS.md`

Root conventions apply everywhere. Package files extend, do not replace.

> **All agents MUST always use the TDD skill when working on, or adding, new features—this is critical for quality and codebase safety.**

## STRUCTURE

```
apps/
  mobile/         # Expo React Native (Expo Router, Clerk, Convex, PostHog)
  website/        # Next.js 16 (marketing, privacy, deep-link landing)
  api/            # FastAPI Python (heavy compute, webhooks, auth boundary)
  convex/         # Convex TypeScript (realtime backend, reactive queries)
  scraper/        # Python CLI (recipe ingestion)
packages/
  contracts/      # Shared TS types (OpenAPI-generated from API)
  config/         # Shared configs (tsconfig, ESLint, Prettier)
.docs/            # Documentation root (guides, reference, architecture, ADRs)
.agents/skills/   # Agent skills (SKILL.md + AGENTS.md per skill)
```

## WHERE TO LOOK

| Task                      | Location                                        | Notes                                                                                                                           |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Add mobile screen**     | `apps/mobile/src/app/(home)/` or `(auth)/`      | File-based routing; extend `go/[...slug].tsx` for deep links                                                                    |
| **Add API route**         | `apps/api/src/routes/`                          | Add module, export in `__init__.py`, register in `main.py`                                                                      |
| **Add Convex function**   | `apps/convex/convex/`                           | Query/mutation; schema in `schema.ts`                                                                                           |
| **Add shared type**       | `packages/contracts/src/types/`                 | Domain types; generated types in `src/generated/` (do not edit)                                                                 |
| **Add scraper logic**     | `apps/scraper/src/`                             | Click CLI; output to stdout or POST                                                                                             |
| **Update docs**           | `.docs/`                                        | Guides, reference, architecture, ADRs, runbooks (deploy, incident)                                                              |
| **Update shared config**  | `packages/config/`                              | ESLint, Prettier, tsconfig — see `packages/config/AGENTS.md`                                                                    |
| **Add or update env var** | Root `.env.example` (and root `.env` for local) | Single place for local dev; root dev scripts inject via dotenv-cli. See [.docs/guides/local-dev.md](.docs/guides/local-dev.md). |

## CODE MAP

| Package         | Type | Location              | Role                                        |
| --------------- | ---- | --------------------- | ------------------------------------------- |
| @korb/mobile    | App  | `apps/mobile/`        | Mobile client (Expo Router, NativeWind)     |
| @korb/api       | App  | `apps/api/`           | HTTP API (FastAPI, uv, Python 3.11)         |
| @korb/convex    | App  | `apps/convex/`        | Realtime backend (Convex, TS)               |
| @korb/scraper   | App  | `apps/scraper/`       | Ingestion CLI (Python, Click)               |
| @korb/website   | App  | `apps/website/`       | Marketing site (Next.js 16, shadcn)         |
| @korb/contracts | Lib  | `packages/contracts/` | API types (OpenAPI → TS)                    |
| @korb/config    | Lib  | `packages/config/`    | Shared configs (tsconfig, ESLint, Prettier) |

## CONVENTIONS

**Monorepo**

- Workspace: `pnpm-workspace.yaml` (`apps/*`, `packages/*`)
- Orchestration: Turbo (`turbo run dev/build/lint/typecheck/test/clean`)
- Naming: All packages scoped `@korb/*`
- Python apps: `pyproject.toml` (uv, ruff, pytest) in `apps/`

**TypeScript**

- Base config: `@korb/config/tsconfig.base.json` (strict, ES2022)
- Path aliases: `@/*` → `./src/*` (mobile, website, contracts)
- ESLint: flat config (v9), shared from `@korb/config/eslint`
- Prettier: `@korb/config/prettier.config.js` (printWidth 100, singleQuote)

**Python**

- API/scraper: uv, ruff (line-length 88, py311), pytest
- Lint-staged: ruff check --fix + format on commit

**Contracts**

- Source: FastAPI → `apps/api/openapi.json`
- Generate: `pnpm contracts:generate` (export OpenAPI → prettier → generate:api → prettier)
- Consumer: `@korb/mobile` (workspace dep + path alias)

**Docs**

- Location: `.docs/` (guides, reference, architecture, ADRs)
- Not `docs/` (dotfolder)

**Environment variables**

- Add or update env vars in **root** `.env.example` (and in root `.env` for local use). Root dev scripts (`pnpm dev`, `pnpm dev:mobile`, etc.) load the root `.env` via dotenv-cli so all apps receive the same vars.
- Do not add env vars only in app-level `.env.example` without updating the root file. Deployment uses platform-provided env, not the root file. See [.docs/guides/local-dev.md](.docs/guides/local-dev.md).

**Agent skills**

- Repo-local skill files and scripts always resolve from repo root as `.agents/skills/<skill>/...`
- Never use `skills/...` in this repository; that alias is ambiguous here
- If a skill is not vendored under `.agents/skills/` (for example `docs-check`), invoke it with the `skill` tool and fall back to manual `git diff`-based review if it is unavailable in the current environment

## ANTI-PATTERNS (THIS PROJECT)

**Security**

- Never commit secrets (use `.env.example`, inject at deploy)
- Never expose server-only secrets to mobile/client
- Never self-investigate security — always escalate

**Auth**

- Do not duplicate auth responsibility: FastAPI verifies Clerk JWT, Convex uses Clerk auth, mobile consumes
- Do not duplicate canonical ownership between FastAPI and Convex

**Generated files**

- Do not edit: `convex/_generated/`, `packages/contracts/src/generated/**`, `apps/website/next-env.d.ts`, `apps/mobile/expo-env.d.ts`
- Regenerate Convex types: `convex dev` (reactive)
- Regenerate API contracts: `pnpm contracts:generate` (see [Contracts guide](.docs/guides/contracts.md))

**Analytics**

- Do not trust client emission — server is authoritative
- Do not create PostHog clients outside designated wiring

**Docs**

- Documentation always in `.docs/` at repo root. Standards: [.docs/DOCUMENTATION_GUIDE.md](.docs/DOCUMENTATION_GUIDE.md)

**Git**

- Never lose more than one small step (safety checkpoints)
- Anti-pattern: one giant commit at end of feature

## UNIQUE STYLES

**Mobile**

- Styling: NativeWind (Tailwind classes on React Native components)
- Navigation: Expo Router (file-based, Stack only)
- Auth: Clerk (token cache, auth layouts redirect based on state)
- Backend: Convex (reactive queries/mutations, realtime)
- Deep links: `korbguru://` scheme + `https://korb.guru/go/` (catch-all handler)

**API**

- Auth: Clerk JWT (placeholder in dev, verify with JWKS in prod)
- Ingest: API key + per-IP exponential backoff
- Analytics: PostHog server-side (flush after every request)
- Docs: OpenAPI at `http://localhost:8000/docs`

**Convex**

- Entry: `convex/` directory (no `main` in package.json)
- Generated: `convex/_generated/server.ts` (do not edit)

**Website**

- Router: App Router only (no `pages/`)
- Styling: Tailwind 4 + shadcn (base-nova)
- Deep links: `/go/[...slug]` catch-all for app linking

## COMMANDS

```bash
# Root (all services)
pnpm install                # Install dependencies
pnpm dev                    # Start every workspace dev process (mobile, website, api, convex, scraper, contracts)
pnpm build                  # Build all (mobile, website, contracts)
pnpm check                  # Full quality pass: format:check + lint + typecheck (use before commit)
pnpm test # Run tests (Jest in mobile, Vitest in contracts/convex, pytest in api/scraper; website has placeholder)
pnpm lint                   # Lint all
pnpm typecheck              # Typecheck all
pnpm format                 # Format all with Prettier (root only)
pnpm format:check           # Check formatting
pnpm clean                  # Clean all + node_modules

# Contracts
pnpm contracts:generate     # Export OpenAPI from API → generate TS → format

# Single app (from root)
pnpm dev:mobile
pnpm dev:api
pnpm dev:convex
pnpm dev:website
pnpm --filter @korb/scraper dev

# Mobile-specific
pnpm --filter @korb/mobile check           # Lint + typecheck
pnpm --filter @korb/mobile check:security  # Security checks (no secrets, auth layouts)
pnpm --filter @korb/mobile build:ios       # Export iOS bundle
pnpm --filter @korb/mobile build:android   # Export Android bundle

# Mobile tests (Jest unit/integration, Maestro E2E; flaky tests quarantined)
pnpm --filter @korb/mobile test            # Main suite (unit + integration)
pnpm --filter @korb/mobile test:unit       # Unit only
pnpm --filter @korb/mobile test:integration # Integration only
pnpm --filter @korb/mobile test:component  # Component tests only
pnpm --filter @korb/mobile test:coverage   # With coverage
pnpm --filter @korb/mobile test:quarantine # Quarantined (flaky) tests only
pnpm --filter @korb/mobile test:mutation   # Stryker mutation testing
pnpm --filter @korb/mobile test:e2e        # Maestro E2E (built app + simulator)
pnpm test:reports                          # Serve coverage + mutation reports on port 9327

# API-specific (Python)
cd apps/api && uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
uv run ruff check src scripts
uv run pytest

# Scraper-specific (Python)
cd apps/scraper && uv run scraper --sink stdout --format json --limit 3
```

## TESTS (mobile)

Mobile uses **Jest** (unit + integration) and **Maestro** (E2E). Flaky tests are quarantined (`*.flaky.test.*`); main suite never runs them. Coverage and mutation reports live in known paths.

- **Full guide:** [.docs/guides/testing.md](.docs/guides/testing.md) (includes flaky-test and quarantine policy)

**Report paths (for agents/CI):** Coverage: `apps/mobile/coverage/` (HTML: `apps/mobile/coverage/index.html`, machine-readable: `apps/mobile/coverage/coverage-final.json`). Mutation: `apps/mobile/coverage/mutations/mutation-report.html`, `apps/mobile/coverage/mutations/mutation-report.json`. Serve all from root: `pnpm test:reports` (http://localhost:9327).

**Agentic hints:** To run only unit tests: `pnpm --filter @korb/mobile test:unit`. To run tests for one file: `pnpm --filter @korb/mobile test -- --testPathPattern=<name>`. To view reports: run `pnpm test:reports` and open the index or direct report URLs.

## NOTES

**Service ownership**

- **Convex**: Realtime UI state, collaborative data (mobile talks directly)
- **FastAPI**: Heavy logic, external APIs, webhooks (mobile/Convex can call)
- **Scraper**: Data ingestion (outputs to file or POST to API/Convex)

**Port map**

- FastAPI: `http://localhost:8000`
- Expo Metro: `http://localhost:8081`
- Convex: Set `EXPO_PUBLIC_CONVEX_URL` to dev deployment URL
- Website: `http://localhost:3001`

**Mobile env (Android emulator)**

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

**Pre-commit**

- Hooks: Husky (installs on `pnpm install`)
- Lint-staged: Prettier (all), ESLint (mobile/packages), Ruff (api/scraper)
- Skip: `git commit --no-verify` (use sparingly)

**CI**

- Jobs: `install` | `lint` (needs `install`) | `test` (needs `install`) | `mobile-build` (needs `install`) | `python-lint-api` | `python-lint-scraper` | `api-health`
- `lint` job runs `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm contracts:generate`, then fails on contract drift
- `test` runs `pnpm test` for the whole monorepo; that includes the website's placeholder `test` script, so CI does not yet enforce real website test coverage
- CI does not run a website build job today; only the mobile export build is enforced in GitHub Actions
- Turbo remote cache is not wired today (`TURBO_TOKEN` / `TURBO_TEAM` are absent) and CI does not use affected-only execution (`--affected` is not configured)

**Contract pipeline**

1. Add/modify Pydantic models in `apps/api/src/routes/*.py`
2. Run `pnpm contracts:generate` from root
3. Generated types appear in `packages/contracts/src/generated/api/` and `packages/contracts/src/generated/index.ts`
4. Import from `@korb/contracts` in mobile
5. Commit both `apps/api/openapi.json` and generated TypeScript files

See [Contracts and codegen guide](.docs/guides/contracts.md) for full details including CI drift detection.
