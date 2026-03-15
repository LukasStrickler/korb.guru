/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IngredientCreate } from './IngredientCreate';
export type RecipeResponse = {
    id: string;
    title: string;
    description: (string | null);
    cost: string;
    time_minutes: number;
    type: string;
    image_url: (string | null);
    ingredients?: Array<IngredientCreate>;
};

