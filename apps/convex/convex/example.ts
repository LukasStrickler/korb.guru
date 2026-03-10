/**
 * Placeholder authenticated Convex functions.
 *
 * Use these as a pattern for any query/mutation that must only run for
 * signed-in users. The Convex client automatically sends the Clerk JWT when
 * using ConvexProviderWithClerk; ctx.auth.getUserIdentity() then returns
 * the identity or null.
 *
 * See .docs/guides/authentication.md and .docs/reference/auth.md.
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Example: query that requires authentication.
 * Returns the current user's identity subject (Clerk user id) or throws.
 */
export const requireAuthExample = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Unauthenticated: sign in to call this function");
    }
    return {
      ok: true,
      subject: identity.subject,
      email: identity.email ?? undefined,
    };
  },
});

/**
 * Example: mutation that requires authentication.
 * Use the same pattern: get identity, throw if null, then use identity.subject
 * or look up your users table by clerkId (identity.subject).
 */
export const requireAuthMutationExample = mutation({
  args: { note: v.string() },
  handler: async (ctx, { note }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Unauthenticated: sign in to call this mutation");
    }
    // In a real app you might store the note in a table keyed by identity.subject
    return { saved: true, forSubject: identity.subject, note };
  },
});
