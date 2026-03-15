/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
 
/**
 * Validated product record from a scraper.
 */
export type ProductRecord = {
  retailer: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
  originalPrice?: number | string | null;
  discountPct?: number | null;
  category?: string | null;
  imageUrl?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  region?: string;
};
