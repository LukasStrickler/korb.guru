/**
 * Meal plan domain types
 */

import type { Id, BaseEntity, Timestamp } from "./common";
import type { RecipeId } from "./recipe";

export type MealPlanId = Id<"MealPlan">;
export type MealEntryId = Id<"MealEntry">;

/**
 * Meal type during the day
 */
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/**
 * Single meal entry in a meal plan
 */
export interface MealEntry extends BaseEntity {
  id: MealEntryId;
  mealPlanId: MealPlanId;
  date: string; // ISO date string YYYY-MM-DD
  mealType: MealType;
  recipeId: RecipeId;
  servings: number;
  notes?: string;
}

/**
 * Meal plan entity for a household
 *
 * Note: This is a placeholder type for the contracts layer.
 * Represents a weekly/monthly meal plan for a household.
 */
export interface MealPlan extends BaseEntity {
  id: MealPlanId;
  householdId: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string; // ISO date string YYYY-MM-DD
  name?: string;
}

/**
 * Meal plan with entries (hydrated view)
 */
export interface MealPlanWithEntries extends MealPlan {
  entries: MealEntry[];
}

/**
 * Meal plan creation payload
 */
export interface CreateMealPlanInput {
  householdId: string;
  startDate: string;
  endDate: string;
  name?: string;
}

/**
 * Meal entry creation payload
 */
export interface CreateMealEntryInput {
  mealPlanId: MealPlanId;
  date: string;
  mealType: MealType;
  recipeId: RecipeId;
  servings: number;
  notes?: string;
}

/**
 * Meal entry update payload
 */
export interface UpdateMealEntryInput {
  recipeId?: RecipeId;
  servings?: number;
  notes?: string;
}

/**
 * Shopping list generated from meal plan
 */
export interface ShoppingList {
  mealPlanId: MealPlanId;
  items: ShoppingListItem[];
  generatedAt: Timestamp;
}

/**
 * Shopping list item (aggregated ingredients)
 */
export interface ShoppingListItem {
  ingredientName: string;
  totalAmount: number;
  unit: string;
  recipeCount: number; // how many recipes use this
  checked: boolean;
}
