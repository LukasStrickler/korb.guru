/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */

import type { ProductRecord } from "./ProductRecord";
export type IngestRequest = {
  source?: string;
  sink?: string;
  recordCount?: number | null;
  records?: Array<ProductRecord>;
  region?: string;
};
