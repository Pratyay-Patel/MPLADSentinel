import { apiClient } from './client';

/** Response shape of `GET /api/health` on the backend. */
export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

/** Calls the backend health endpoint. Used to verify backend connectivity. */
export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiClient.get<HealthResponse>('/health', { signal });
}
