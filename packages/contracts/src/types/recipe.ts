/**
 * Recipe domain types
 */

import type { Id, BaseEntity } from "./common";

export type RecipeId = Id<"Recipe">;

/**
 * Ingredient in a recipe
 */
export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  notes?: string;
}

/**
 * Recipe step/instruction
 */
export interface RecipeStep {
  order: number;
  instruction: string;
  duration?: number; // in minutes
}

/**
 * Recipe metadata
 */
export interface RecipeMetadata {
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  cuisine?: string;
  tags: string[];
}

/**
 * Recipe entity
 *
 * Note: This is a placeholder type for the contracts layer.
 * Represents a recipe that can be added to meal plans.
 */
export interface Recipe extends BaseEntity {
  id: RecipeId;
  title: string;
  description?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  metadata: RecipeMetadata;
  imageUrl?: string;
  sourceUrl?: string;
  authorId?: string;
}

/**
 * Recipe creation payload
 */
export interface CreateRecipeInput {
  title: string;
  description?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  metadata: RecipeMetadata;
  imageUrl?: string;
  sourceUrl?: string;
}

/**
 * Recipe update payload
 */
export interface UpdateRecipeInput {
  title?: string;
  description?: string;
  ingredients?: Ingredient[];
  steps?: RecipeStep[];
  metadata?: Partial<RecipeMetadata>;
  imageUrl?: string;
  sourceUrl?: string;
}

/**
 * Recipe search/filter parameters
 */
export interface RecipeSearchParams {
  query?: string;
  tags?: string[];
  cuisine?: string;
  maxPrepTime?: number;
  maxCookTime?: number;
  difficulty?: RecipeMetadata["difficulty"];
}
