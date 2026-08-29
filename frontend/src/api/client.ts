/**
 * Centralized HTTP client for talking to the MPLADSentinel backend.
 *
 * Every backend call in the app goes through this module so that base URL,
 * headers, error handling and JSON parsing stay consistent. UI components and
 * feature modules must not call `fetch` directly, and must never call external
 * MPLADS / third-party APIs — those are integrated server-side only.
 */

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Parsed and sent as a JSON request body. */
  body?: unknown;
  /** Extra headers merged over the defaults. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** Error thrown for any non-2xx response or transport failure. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function joinPath(base: string, path: string): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { method = 'GET', body, headers = {}, signal } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    // Send the session cookie so authenticated endpoints work cross-origin in
    // dev (the SPA and the backend are on different ports). The backend's CORS
    // config sets Allow-Credentials for the allow-listed origin.
    credentials: 'include',
    signal,
  };

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(joinPath(API_BASE_URL, path), requestInit);
  } catch (cause) {
    throw new ApiError('Network request failed', 0, cause);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
  const payload: unknown = isJson
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with ${response.status}`,
      response.status,
      payload,
    );
  }

  return payload as TResponse;
}

export const apiClient = {
  baseUrl: API_BASE_URL,
  get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
};
