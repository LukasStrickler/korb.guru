/**
 * Smoke tests for @korb/contracts types
 *
 * These tests verify that the type contracts are correctly structured
 * and can be used as expected in consuming packages.
 */

import { describe, expect, it } from "vitest";
import type {
  User,
  UserId,
  UserPreferences,
  Recipe,
  RecipeId,
  Ingredient,
  RecipeMetadata,
  Id,
  Timestamp,
  BaseEntity,
  PaginationParams,
  PaginatedResponse,
  Result,
  HelloResponse,
} from "./types";

describe("Common types", () => {
  it("Id type is a branded string", () => {
    const userId: Id<"User"> = "user_123" as Id<"User">;
    expect(typeof userId).toBe("string");
  });

  it("Timestamp is a number", () => {
    const ts: Timestamp = Date.now();
    expect(typeof ts).toBe("number");
  });

  it("BaseEntity has required fields", () => {
    const entity: BaseEntity = {
      id: "test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(entity.id).toBeDefined();
    expect(entity.createdAt).toBeDefined();
    expect(entity.updatedAt).toBeDefined();
  });

  it("PaginationParams has optional fields", () => {
    const params: PaginationParams = { limit: 10 };
    expect(params.limit).toBe(10);
    expect(params.cursor).toBeUndefined();
  });

  it("PaginatedResponse wraps items with cursor", () => {
    const response: PaginatedResponse<string> = {
      items: ["a", "b"],
      nextCursor: "next",
      hasMore: true,
    };
    expect(response.items).toHaveLength(2);
    expect(response.hasMore).toBe(true);
  });

  it("Result type supports success case", () => {
    const result: Result<string> = { ok: true, value: "success" };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("success");
    }
  });

  it("Result type supports error case", () => {
    const result: Result<string, string> = {
      ok: false,
      error: "something went wrong",
    };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("something went wrong");
    }
  });

  it("HelloResponse has message field", () => {
    const response: HelloResponse = { message: "Hello from FastAPI" };
    expect(response.message).toBe("Hello from FastAPI");
  });
});

describe("User types", () => {
  it("UserPreferences has dietary and cuisine options", () => {
    const prefs: UserPreferences = {
      dietaryRestrictions: ["vegetarian"],
      servingSize: 4,
      cuisinePreferences: ["Italian", "Mexican"],
      excludedIngredients: ["cilantro"],
    };
    expect(prefs.dietaryRestrictions).toContain("vegetarian");
    expect(prefs.servingSize).toBe(4);
  });

  it("User extends BaseEntity with preferences", () => {
    const user: User = {
      id: "user_123" as UserId,
      email: "test@example.com",
      displayName: "Test User",
      preferences: {
        dietaryRestrictions: [],
        servingSize: 2,
        cuisinePreferences: [],
        excludedIngredients: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(user.email).toBe("test@example.com");
    expect(user.preferences.servingSize).toBe(2);
  });
});

describe("Recipe types", () => {
  it("Ingredient has name, amount, and unit", () => {
    const ingredient: Ingredient = {
      name: "flour",
      amount: 2,
      unit: "cups",
    };
    expect(ingredient.name).toBe("flour");
    expect(ingredient.amount).toBe(2);
    expect(ingredient.unit).toBe("cups");
  });

  it("RecipeMetadata has timing and difficulty", () => {
    const metadata: RecipeMetadata = {
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      difficulty: "medium",
      tags: ["dinner", "quick"],
    };
    expect(metadata.prepTime).toBe(15);
    expect(metadata.difficulty).toBe("medium");
    expect(metadata.tags).toContain("dinner");
  });

  it("Recipe has full structure with steps", () => {
    const recipe: Recipe = {
      id: "recipe_123" as RecipeId,
      title: "Pasta Carbonara",
      description: "Classic Italian pasta dish",
      ingredients: [
        { name: "spaghetti", amount: 400, unit: "g" },
        { name: "eggs", amount: 4, unit: "large" },
      ],
      steps: [
        { order: 1, instruction: "Boil pasta", duration: 10 },
        { order: 2, instruction: "Mix eggs with cheese" },
      ],
      metadata: {
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        difficulty: "medium",
        tags: ["pasta", "italian"],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(recipe.title).toBe("Pasta Carbonara");
    expect(recipe.ingredients).toHaveLength(2);
    expect(recipe.steps).toHaveLength(2);
    expect(recipe.metadata.servings).toBe(4);
  });
});
