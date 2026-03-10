# WEBSITE AGENTS.md

## OVERVIEW

Next.js 16 marketing site with App Router, Tailwind 4, shadcn, and deep-link landing pages.

## STRUCTURE

```
app/
  layout.tsx          # Root layout with fonts, metadata, Header
  page.tsx            # Landing page (home)
  privacy/page.tsx    # Privacy policy
  impressum/page.tsx  # Legal notice
  go/[...slug]/      # Deep-link catch-all (client component)
  globals.css         # Tailwind 4 + shadcn theme
components/
  header.tsx          # Site header
  ui/                 # shadcn primitives (button.tsx, etc.)
lib/
  utils.ts            # cn() helper for Tailwind classes
  app-linking.ts      # APP_SCHEME constant for deep links
public/
  .well-known/       # assetlinks.json, apple-app-site-association
```

## WHERE TO LOOK

| Task                    | Location                                            |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add static page         | `app/[page]/page.tsx`                               |
| Add component           | `components/[name].tsx`                             |
| Add shadcn primitive    | `components/ui/[name].tsx`                          |
| Update deep-link scheme | `lib/app-linking.ts`                                |
| Update metadata         | `app/layout.tsx`                                    |
| Style/theme changes     | `app/globals.css`                                   |
| Well-known files        | `public/.well-known/`                               |
| Add/update env var      | **Root** `.env.example` (and root `.env` for local) | Website receives env from root when run via `pnpm dev:website` from repo root. See [.docs/guides/local-dev.md](../../.docs/guides/local-dev.md). |

## CONVENTIONS

**App Router**

- File-based routing in `app/` (no `pages/`)
- Catch-all routes: `[...slug]/page.tsx`

**shadcn/ui**

- Primitives in `components/ui/` using @base-ui/react
- Use `cn()` from `lib/utils.ts` for conditional classes
- Variants via `class-variance-authority`

**Styling**

- Tailwind 4 with CSS-first configuration
- Theme tokens in `globals.css` (shadcn base-nova)
- Path alias: `@/*` maps to `./*`

**Deep Links**

- Scheme: `korbguru://` (must match mobile app.json)
- Web route: `/go/[...slug]` opens app or shows download page
- Well-known files for Universal Links / App Links verification

**Static Pages**

- Default server components (no "use client")
- Metadata exported from `layout.tsx` or page files
- OpenGraph, Twitter card configured in root metadata

## ANTI-PATTERNS

- Do not use `pages/` directory (App Router only)
- Do not add API routes here (use FastAPI in `apps/api/`)
- Do not edit `.next/` or `next-env.d.ts` (generated)
- Do not hardcode store URLs (use placeholders, replace before deploy)
- Do not forget to update well-known files with real Team ID / SHA256 fingerprints

## COMMANDS

| Command          | Description                               |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Start dev server at http://localhost:3001 |
| `pnpm build`     | Build for production                      |
| `pnpm lint`      | Run ESLint                                |
| `pnpm typecheck` | Run TypeScript check                      |
| `pnpm test`      | Placeholder — no tests yet                |

## QUALITY EXPECTATIONS

### Current State

| Aspect    | Status   | Notes                      |
| --------- | -------- | -------------------------- |
| Lint      | Active   | ESLint with Next.js config |
| Typecheck | Active   | TypeScript strict mode     |
| Tests     | **None** | Placeholder script only    |

### Known Gaps

- **No automated tests**: The website has no unit, integration, or E2E tests. The `test` script in `package.json` is a placeholder (`echo 'No tests yet'`).
- **No visual regression testing**: Marketing pages are not covered by screenshot tests.
- **No accessibility testing**: Automated a11y checks are not configured.

When adding features, rely on manual verification and type safety. If adding tests later, consider:

- **Unit**: Vitest for utility functions
- **Component**: Storybook or React Testing Library for UI components
- **E2E**: Playwright for critical user flows (landing → download)
