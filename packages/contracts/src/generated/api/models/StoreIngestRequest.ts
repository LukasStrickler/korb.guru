/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */

import type { GoogleMapsPlace } from "./GoogleMapsPlace";
/**
 * Request body for bulk store ingestion from Google Maps.
 */
export type StoreIngestRequest = {
  places: Array<GoogleMapsPlace>;
  region?: string;
};
