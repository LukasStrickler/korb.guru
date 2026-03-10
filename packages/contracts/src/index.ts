/**
 * @korb/contracts - Shared type contracts
 *
 * This package provides stable type contracts shared between:
 * - Mobile app (Expo)
 * - FastAPI backend
 * - Convex realtime backend
 *
 * Structure:
 * - src/types/     -> Authored domain types (User, Recipe, MealPlan)
 * - src/generated/ -> Auto-generated types from OpenAPI schema
 */

// Authored types
export * from "./types";

export * from "./generated";
