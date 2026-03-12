import type { AuthConfig } from "convex/server";

/**
 * Clerk auth provider for Convex.
 *
 * Domain = Clerk Frontend API URL (issuer). Set ONE of these in Convex Dashboard (Settings → Environment variables):
 * - CLERK_JWT_ISSUER_DOMAIN (Convex docs: https://docs.convex.dev/auth/clerk)
 * - CLERK_FRONTEND_API_URL (Clerk docs: https://clerk.com/docs/guides/development/integrations/databases/convex)
 *
 * Value: dev → https://verb-noun-00.clerk.accounts.dev, prod → https://clerk.<your-domain>.com
 * Get it from Clerk Dashboard → Convex integration (Activate Convex integration → copy Frontend API URL).
 * applicationID "convex" is required; Clerk’s Convex integration pre-maps the aud claim.
 *
 * Run `npx convex dev` after changing env vars.
 */
const clerkIssuerDomain =
  process.env.CLERK_JWT_ISSUER_DOMAIN ?? process.env.CLERK_FRONTEND_API_URL;

if (!clerkIssuerDomain) {
  throw new Error(
    "Convex auth: set CLERK_JWT_ISSUER_DOMAIN or CLERK_FRONTEND_API_URL in Convex Dashboard to your Clerk Frontend API URL (e.g. https://....clerk.accounts.dev)",
  );
}

export default {
  providers: [
    {
      domain: clerkIssuerDomain,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
