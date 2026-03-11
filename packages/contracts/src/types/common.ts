/**
 * Common base types shared across the application
 */

/**
 * Branded type for IDs to prevent mixing different entity IDs
 */
export type Id<T extends string> = string & { readonly __brand: T };

/**
 * Timestamp in milliseconds since epoch
 */
export type Timestamp = number;

/**
 * Common entity base with ID and timestamps
 */
export interface BaseEntity {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface HelloResponse {
  message: string;
}
