import type { AuthConfig } from "convex/server";

/**
 * Clerk JWT issuer domain from Convex env (CLERK_JWT_ISSUER_DOMAIN).
 * Set in Convex Dashboard: https://dashboard.convex.dev
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
