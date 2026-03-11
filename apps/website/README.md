# Korb Guru Website

Next.js marketing site for **korb.guru**: landing, privacy policy, Impressum, and app deep-link flow. Uses shadcn/ui and is deployable to Vercel.

## What it provides

- **Landing** (`/`) — SEO-friendly homepage with funnel to App Store / Google Play.
- **Privacy** (`/privacy`) — Privacy policy page; set `https://korb.guru/privacy` in App Store Connect and Google Play Console.
- **Impressum** (`/impressum`) — Legal notice (template; required in some jurisdictions).
- **Shared links** (`/go/...`) — When users share `https://korb.guru/go/xyz`, opening the link can open the Korb Guru app (Universal Links / App Links) or show an “Open in app” / “Download” page.

## Local development

From repo root:

```bash
pnpm --filter @korb/website dev
```

Runs at [http://localhost:3001](http://localhost:3001).

## Deploy on Vercel

1. In Vercel, create a project linked to your repo.
2. Set **Root Directory** to `apps/website`.
3. Build command: `pnpm build` (or `cd ../.. && pnpm install && pnpm --filter @korb/website build` if you need workspace install).
4. Install command: `pnpm install` (from repo root if Vercel runs from root, or set root to `apps/website` and use `pnpm install` in that directory with a root `pnpm-workspace.yaml` that includes the workspace).  
   **Recommended:** Use monorepo root as Vercel root, set **Root Directory** to `apps/website`, and in Vercel project settings set **Install Command** to `pnpm install` (run from repo root by Vercel).
5. Point your domain **korb.guru** to the Vercel project.

See [Vercel monorepo docs](https://vercel.com/docs/monorepos) for root vs. app directory setup.

## Deep links (Universal Links / App Links)

The site serves the verification files required for iOS and Android to open `https://korb.guru/go/*` in the app:

- **iOS:** `/.well-known/apple-app-site-association`
- **Android:** `/.well-known/assetlinks.json`

**Before links work in the app:**

1. Deploy the website so `https://korb.guru` is live.
2. Replace placeholders in `public/.well-known/`:
   - **apple-app-site-association:** replace `REPLACE_WITH_APPLE_TEAM_ID` with your [Apple Team ID](https://expo.fyi/apple-team) (same value in all three places in the file).
   - **assetlinks.json:** replace `REPLACE_WITH_SHA256_FINGERPRINT_FROM_EAS_OR_PLAY_CONSOLE` with the SHA256 certificate fingerprint from `eas credentials -p android` or Google Play Console → Release → Setup → App Signing.
3. Rebuild and reinstall the mobile app so the OS can verify the association.

The mobile app (`apps/mobile/app.json`) is already configured with `ios.associatedDomains` and `android.intentFilters` for `korb.guru` and `/go`.

## Store links and Smart Banner

- Replace `#app-store` and `#play-store` on the landing and `/go` pages with your real App Store and Google Play URLs when the app is published.
- Optional: in `app/layout.tsx`, uncomment and set the `apple-itunes-app` meta tag with your App Store ID for the Smart App Banner on iOS.

## Commands

| Command                                 | Description                               |
| --------------------------------------- | ----------------------------------------- |
| `pnpm --filter @korb/website dev`       | Start dev server at http://localhost:3001 |
| `pnpm --filter @korb/website build`     | Build for production                      |
| `pnpm --filter @korb/website lint`      | Run ESLint                                |
| `pnpm --filter @korb/website typecheck` | Run TypeScript check                      |
| `pnpm --filter @korb/website test`      | Placeholder — no tests yet                |

## Known Gaps

- **Tests**: The website currently has no automated tests. The `test` script is a placeholder that outputs "No tests yet". Testing strategy for the marketing site is deferred until the UI stabilizes.
