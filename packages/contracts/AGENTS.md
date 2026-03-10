# AGENTS.md

## OVERVIEW

Shared TypeScript package with authored domain types and OpenAPI-generated API contracts.

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
- Output: `src/generated/api/`
- Do NOT manually edit generated types

**Consumption**

- Install: `pnpm --filter @korb/mobile add @korb/contracts`
- Import: `import { IngestRequest } from '@korb/contracts'`
- Path alias: `@/*` → `./src/*`

**Build**

- Tool: `tsup` (CJS + ESM + .d.ts)
- Output: `dist/` (published to npm)

## ANTI-PATTERNS

- **Do NOT edit** `src/generated/**` — regenerate from FastAPI instead
- **Do NOT modify** `packages/contracts/src/generated/server.ts` (auto-created by codegen)
- **Do NOT duplicate** type definitions between `src/types/` and `src/generated/` — use authored types for business logic
