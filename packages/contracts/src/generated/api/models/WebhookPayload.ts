/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApifyResource } from './ApifyResource';
/**
 * Payload sent by the swiss-grocery-scraper actor after a run.
 */
export type WebhookPayload = {
    event?: string;
    totalItems?: number;
    region?: string;
    retailers?: Array<string>;
    durationS?: number;
    resource?: (ApifyResource | null);
};

