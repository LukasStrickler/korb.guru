/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
 
import type { GroceryItemResponse } from "./GroceryItemResponse";
export type GroceryListResponse = {
  id: string;
  name: string;
  estimated_total: number;
  items?: Array<GroceryItemResponse>;
};
