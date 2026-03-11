# Config Package

## OVERVIEW

Shared TypeScript configs for the monorepo: tsconfig, ESLint (flat config v9), Prettier.

**Ownership:** This package owns all shared tooling configuration. Changes here affect every consuming app. When modifying shared configs, consider the blast radius and communicate changes that affect developer workflow.

## STRUCTURE

```
packages/config/
├── tsconfig.base.json    # Shared TS base (ES2022, strict) — extended by mobile
├── tsconfig.json         # Package build config
├── eslint.config.js      # ESLint flat config (v9) — imported by convex, contracts
├── prettier.config.js    # Prettier (printWidth 100, singleQuote)
├── index.ts              # Exports all configs (programmatic access)
└── vitest.config.ts      # Test config
```

## WHERE TO LOOK

| Task                             | Location                                                | Notes                                                                 |
| -------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Update TS strictness             | `tsconfig.base.json`                                    | ES2022, noUncheckedIndexedAccess, exactOptionalPropertyTypes          |
| Add ESLint rule                  | `eslint.config.js`                                      | Flat config v9; test in consuming apps                                |
| Update Prettier options          | `prettier.config.js`                                    | printWidth 100, singleQuote, trailingComma all                        |
| Add new config export            | `index.ts` + `package.json` exports                     | Update both for programmatic and import access                        |
| See which apps use shared config | Check `apps/*/eslint.config.js`, `apps/*/tsconfig.json` | Mobile, convex, contracts use shared; website uses eslint-config-next |

## CONSUMPTION PATTERNS

### TypeScript

**Extend base config (mobile only):**

```json
{
  "extends": "@korb/config/tsconfig.base",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**Standalone config (convex, contracts):**
These apps define their own `tsconfig.json` without extending the base, but follow the same strict settings for consistency.

### ESLint

**Direct import (convex):**

```js
import config from '@korb/config/eslint';
export default config;
```

**Extend with overrides (contracts):**

```js
import config from '../config/eslint.config.js';
export default [...config, { ignores: ['src/generated/**'] }];
```

**Not using shared config (website):**
Website uses `eslint-config-next` only, not the shared config.

### Prettier

Root `pnpm format` / `format:check` run Prettier directly from the repo root via glob patterns. Individual apps typically do not define their own Prettier config.

## CONVENTIONS

**TypeScript**

- Base: `tsconfig.base.json` — strict, ES2022, noUncheckedIndexedAccess, exactOptionalPropertyTypes
- Only `apps/mobile` extends this base; other apps have standalone tsconfig
- Path aliases defined per-app (`@/*` → `./src/*`)

**ESLint**

- Flat config (v9) in `eslint.config.js`
- Exports ignores, TS/JS rules, test-file relaxations
- Used by: mobile (via Expo), convex (as-is), contracts (with `src/generated/**` ignore)
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

- **Do not add app-specific rules to shared configs** — extend/override in the consuming app
- **Do not forget to update all apps when changing base rules** — run `pnpm lint` across the monorepo to verify
- **Do not use `.eslintrc*` files** — project uses flat config only
- **Do not change Prettier settings lightly** — this causes large diffs across the entire codebase
- **Do not remove strict TypeScript rules without team discussion** — strictness is intentional for catching bugs early
- **Do not add heavy dependencies to this package** — keep it lightweight; peer dependencies only
