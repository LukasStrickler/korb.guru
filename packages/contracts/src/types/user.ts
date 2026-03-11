/**
 * User domain types
 */

import type { Id, BaseEntity } from "./common";

export type UserId = Id<"User">;

/**
 * User preferences for meal planning
 */
export interface UserPreferences {
  dietaryRestrictions: DietaryRestriction[];
  servingSize: number;
  cuisinePreferences: string[];
  excludedIngredients: string[];
}

export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "dairy-free"
  | "nut-free"
  | "kosher"
  | "halal";

/**
 * User entity
 *
 * Note: This is a placeholder type for the contracts layer.
 * The actual Convex schema may differ - this represents the
 * stable contract that mobile/FastAPI code targets.
 */
export interface User extends BaseEntity {
  id: UserId;
  email: string;
  displayName: string;
  preferences: UserPreferences;
  householdId?: string;
}

/**
 * User creation payload
 */
export interface CreateUserInput {
  email: string;
  displayName: string;
  preferences?: Partial<UserPreferences>;
}

/**
 * User update payload
 */
export interface UpdateUserInput {
  displayName?: string;
  preferences?: Partial<UserPreferences>;
  householdId?: string;
}
