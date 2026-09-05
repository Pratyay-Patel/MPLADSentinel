import type { Grievance, GrievanceInput, GrievanceStatusPatch } from '../data/types';
import { apiClient } from './client';

interface PageResponse<T> {
  content: T[];
}

/**
 * Backend calls for the grievance API (Phase B4). The response JSON matches the
 * `Grievance` domain type (`id` is a string on both sides); `ApiDataProvider`
 * owns error mapping.
 *
 * RBAC is server-enforced: `GET` is scoped to the caller (a citizen sees only
 * their own), `POST` is CITIZEN-only, `PATCH` is MoSPI/State/District-only.
 */
export const getGrievances = (signal?: AbortSignal): Promise<Grievance[]> =>
  apiClient.get<PageResponse<Grievance>>('/grievances', { signal }).then((page) => page.content);

export const postGrievance = (
  input: GrievanceInput,
  signal?: AbortSignal,
): Promise<Grievance> => apiClient.post('/grievances', input, { signal });

export const patchGrievanceStatus = (
  id: string,
  patch: GrievanceStatusPatch,
  signal?: AbortSignal,
): Promise<Grievance> => apiClient.patch(`/grievances/${id}`, patch, { signal });
