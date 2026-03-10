# Config Package

Shared TypeScript configs for the monorepo: tsconfig, ESLint (flat config v9), Prettier.

## STRUCTURE

```
packages/config/
├── tsconfig.base.json   # Shared TS base (ES2022, strict)
├── tsconfig.json        # Package build config
├── eslint.config.js     # ESLint flat config (v9)
├── prettier.config.js   # Prettier (printWidth 100, singleQuote)
├── index.ts             # Exports all configs
└── vitest.config.ts     # Test config
```

## WHERE TO LOOK

| Task                    | Location             | Notes                                          |
| ----------------------- | -------------------- | ---------------------------------------------- |
| Update TS strictness    | `tsconfig.base.json` | ES2022, noUncheckedIndexedAccess, etc.         |
| Add ESLint rule         | `eslint.config.js`   | Flat config; export as `@korb/config/eslint`   |
| Update Prettier options | `prettier.config.js` | printWidth 100, singleQuote, trailingComma all |

## CONVENTIONS

**TypeScript**

- Base: `tsconfig.base.json` — strict, ES2022, noUncheckedIndexedAccess, exactOptionalPropertyTypes
- Only `apps/mobile` extends this base; other apps have standalone tsconfig
- Path aliases defined per-app (`@/*` → `./src/*`)

**ESLint**

- Flat config (v9) in `eslint.config.js`
- Exports ignores, TS/JS rules, test-file relaxations
- Used by: mobile (with `.expo/**` ignore), convex (as-is), contracts (with `src/generated/**` ignore)
- Website uses `eslint-config-next` only (not this shared config)

**Prettier**

- `prettier.config.js`: printWidth 100, singleQuote, trailingComma "all", endOfLine "lf"
- Root `pnpm format` / `format:check` run Prettier directly (not via Turbo)

**Exports** (from `index.ts`)

- `@korb/config/tsconfig` → `tsconfig.json`
- `@korb/config/tsconfig.base` → `tsconfig.base.json`
- `@korb/config/eslint` → `eslint.config.js`
- `@korb/config/prettier` → `prettier.config.js`

## ANTI-PATTERNS

- Do not add app-specific rules to shared configs — extend/override in app
- Do not forget to update all apps when changing base rules (consistency)
- Do not use `.eslintrc*` files — project uses flat config only
