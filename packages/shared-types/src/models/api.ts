/**
 * Common API type definitions
 */

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

/**
 * API success response for mutations
 */
export interface ApiSuccess {
  success: boolean;
  message?: string;
}

/**
 * Sort order type
 */
export type SortOrder = 'ASC' | 'DESC';

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}
