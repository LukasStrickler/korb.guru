/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
 
import type { IngredientCreate } from "./IngredientCreate";
import type { RecipeType } from "./RecipeType";
export type RecipeCreate = {
  title: string;
  description?: string | null;
  cost: number | string;
  time_minutes: number;
  type: RecipeType;
  image_url?: string | null;
  ingredients?: Array<IngredientCreate>;
};
