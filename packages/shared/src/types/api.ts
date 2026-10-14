/**
 * Standard API Request and Response Envelope Types
 */

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiMeta {
  timestamp: string;
  requestId?: string;
  coverage?: {
    isComplete: boolean;
    warnings?: string[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: ApiMeta;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  services: {
    database: 'connected' | 'disconnected' | 'disabled';
    redis: 'connected' | 'disconnected' | 'disabled';
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
