# Contracts Package

Shared TypeScript package with authored domain types and OpenAPI-generated API contracts.

This file extends root [`AGENTS.md`](../../AGENTS.md) conventions. Read root first for global patterns, then return here for contracts-specific rules.

## STRUCTURE

```
packages/contracts/
├── src/
│   ├── types/          # Authored domain types
│   ├── generated/      # OpenAPI-generated types
│   ├── index.ts        # Public API (re-exports)
│   └── types.test.ts   # Type tests
└── package.json
```

## WHERE TO LOOK

| Task                     | Location                                   | Notes                                           |
| ------------------------ | ------------------------------------------ | ----------------------------------------------- |
| Add authored type        | `src/types/*.ts`                           | Domain models for users, recipes, plans         |
| Edit generated type      | `src/generated/api/*.ts`                   | Auto-generated — never edit, regenerate instead |
| Add new OpenAPI type     | Modify `apps/api/src/routes/` → regenerate | Run `pnpm contracts:generate`                   |
| Update generation config | `package.json` → `generate:api` script     | openapi-typescript-codegen CLI options          |

## CONVENTIONS

**Generation pipeline**

1. Modify FastAPI models in `apps/api/src/routes/`
2. Run `pnpm contracts:generate` from root
3. Regenerated types appear in `src/generated/api/`
4. OpenAPI JSON exports from FastAPI → prettier → generate:api → prettier

**Generated files**

- Source: `apps/api/openapi.json` (FastAPI OpenAPI 3.1)
- Tool: `openapi-typescript-codegen`
- Output: `src/generated/api/` (models and index)
- Entry: `src/generated/index.ts` (re-exports)
- **Do NOT manually edit any file under `src/generated/`** — regenerate instead

**Regeneration flow:**

1. Modify FastAPI models in `apps/api/src/routes/*.py`
2. Run `pnpm contracts:generate` from repo root
3. Review changes: `git diff packages/contracts/src/generated/`
4. Commit both `apps/api/openapi.json` and generated TypeScript files

**Consumption**

- Install: `pnpm --filter @korb/mobile add @korb/contracts`
- Import: `import { IngestRequest } from '@korb/contracts'`
- Path alias: `@/*` → `./src/*`

**Build**

- Tool: `tsup` (CJS + ESM + .d.ts)
- Output: `dist/` (published to npm)

## ANTI-PATTERNS

- **Do NOT edit** `src/generated/**` — regenerate from FastAPI instead
- **Do NOT duplicate** type definitions between `src/types/` and `src/generated/` — use authored types for business logic, import generated types for API contracts
