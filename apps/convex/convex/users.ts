import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateHandle, normalizeHandle } from "./handle";

export {
  validateHandle,
  normalizeHandle,
  HANDLE_REGEX,
  RESERVED_HANDLES,
} from "./handle";

/** Get current user from Convex auth (Clerk). Returns null if not authenticated. */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

/** Get user by handle (for deep links). Public so unauthenticated users can resolve links. */
export const getByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const normalized = normalizeHandle(handle);
    if (!normalized) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalized))
      .first();
  },
});

/** Sync current Clerk user to Convex users table. Call after sign-in. */
export const syncFromClerk = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const clerkId = identity.subject;
    const email = identity.email ?? "";
    const name = identity.name ?? email.split("@")[0] ?? "User";
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId,
      email,
      name,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Set or update the current user's handle. Must be unique. */
export const setHandle = mutation({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const normalized = normalizeHandle(handle);
    validateHandle(normalized);

    const existingByClerk = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!existingByClerk) throw new Error("User not found. Sign in again.");

    const taken = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalized))
      .first();
    if (taken && taken._id !== existingByClerk._id) {
      throw new Error("This handle is already taken.");
    }

    await ctx.db.patch(existingByClerk._id, {
      handle: normalized,
      updatedAt: Date.now(),
    });
    return normalized;
  },
});

/** Look up user by email. Requires auth (server-only or authenticated callers). */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

/** List all users. Requires auth; restrict or remove for production if needed. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.db.query("users").collect();
  },
});

/**
 * Delete the current user and their data (e.g. recipes). Required for App Store
 * account-deletion compliance. Call from the app after user confirms; then
 * sign out and optionally call backend to delete Clerk user.
 */
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return;

    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const recipe of recipes) {
      await ctx.db.delete(recipe._id);
    }
    await ctx.db.delete(user._id);
  },
});
