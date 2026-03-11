import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

/**
 * Get recipes for the current authenticated user.
 * Requires authentication - only returns the caller's own recipes.
 */
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Verify the caller is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "unauthenticated",
        message: "Not signed in",
      });
    }

    // Get the current user's record
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new ConvexError({
        code: "not_found",
        message: "User not found",
      });
    }

    // Security check: only allow users to query their own recipes
    if (currentUser._id !== userId) {
      throw new ConvexError({
        code: "permission_denied",
        message: "Cannot access another user's recipes",
      });
    }

    return await ctx.db
      .query("recipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Get recipes for the current user (no userId parameter needed).
 * Convenience method that derives userId from auth.
 */
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "unauthenticated",
        message: "Not signed in",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("recipes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Example query: Get recent recipes
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    return await ctx.db
      .query("recipes")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});

/** Create a recipe for the current user. Requires auth; userId is derived from Clerk identity. */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    ingredients: v.array(v.string()),
    instructions: v.array(v.string()),
    prepTimeMinutes: v.optional(v.number()),
    cookTimeMinutes: v.optional(v.number()),
    servings: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "unauthenticated",
        message: "Not signed in",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) {
      throw new ConvexError({
        code: "not_found",
        message: "User not found. Sign in again.",
      });
    }
    const recipeId = await ctx.db.insert("recipes", {
      ...args,
      userId: user._id,
      createdAt: Date.now(),
    });
    return recipeId;
  },
});
