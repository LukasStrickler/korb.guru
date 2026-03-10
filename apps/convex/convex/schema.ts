import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    /** Unique handle for deep links (e.g. korb.guru/add/johndoe). 3–30 chars, alphanumeric + underscore. */
    handle: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_handle", ["handle"]),

  recipes: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    ingredients: v.array(v.string()),
    instructions: v.array(v.string()),
    prepTimeMinutes: v.optional(v.number()),
    cookTimeMinutes: v.optional(v.number()),
    servings: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["createdAt"]),
});
