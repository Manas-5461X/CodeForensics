import type { ApiResponse } from '@codeforensics/shared';
import { useAuth } from '../context/AuthContext.js';
import { useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface ApiClientOptions extends RequestInit {
  token?: string | null;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code = 'API_ERROR', statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Core fetch wrapper with envelope unwrapping and bearer token attachment
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<ApiResponse<T>> {
  const { token, params, headers, timeoutMs = 60000, ...restOptions } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const query = searchParams.toString();
    if (query) {
      url += (url.includes('?') ? '&' : '?') + query;
    }
  }

  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('Content-Type') && restOptions.body && typeof restOptions.body === 'string') {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      signal: options.signal || controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiClientError(
        'Request timed out. The server may be waking up from sleep. Please try again.',
        'TIMEOUT',
        408
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  let data: ApiResponse<T>;
  try {
    data = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(
      `Failed to parse response from server (${response.status} ${response.statusText})`,
      'PARSE_ERROR',
      response.status
    );
  }

  if (!response.ok || !data.success) {
    const errorCode = data.error?.code || 'UNKNOWN_ERROR';
    const errorMessage = data.error?.message || `Request failed with status ${response.status}`;
    throw new ApiClientError(errorMessage, errorCode, response.status, data.error?.details);
  }

  return data;
}

/**
 * React hook that automatically injects the current Firebase ID token into API requests
 */
export function useApiClient() {
  const { getIdToken } = useAuth();

  const request = useCallback(
    async <T>(endpoint: string, options: ApiClientOptions = {}): Promise<ApiResponse<T>> => {
      let token = options.token;
      if (token === undefined) {
        token = await getIdToken();
      }
      return apiClient<T>(endpoint, { ...options, token });
    },
    [getIdToken]
  );

  const get = useCallback(
    <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>, options: ApiClientOptions = {}) =>
      request<T>(endpoint, { ...options, method: 'GET', params }),
    [request]
  );

  const post = useCallback(
    <T>(endpoint: string, body?: unknown, options: ApiClientOptions = {}) =>
      request<T>(endpoint, {
        ...options,
        method: 'POST',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
    [request]
  );

  const patch = useCallback(
    <T>(endpoint: string, body?: unknown, options: ApiClientOptions = {}) =>
      request<T>(endpoint, {
        ...options,
        method: 'PATCH',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
    [request]
  );

  const del = useCallback(
    <T>(endpoint: string, options: ApiClientOptions = {}) =>
      request<T>(endpoint, { ...options, method: 'DELETE' }),
    [request]
  );

  return { request, get, post, patch, del };
}
