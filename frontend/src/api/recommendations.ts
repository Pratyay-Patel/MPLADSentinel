import type {
  WorkRecommendation,
  WorkRecommendationInput,
  WorkRecommendationStatusPatch,
} from '../data/types';
import { apiClient } from './client';

/**
 * Backend calls for the work-recommendation API (citizen "recommend a work",
 * e-SAKSHI-style). Response JSON matches the `WorkRecommendation` domain type
 * (`id` is a string on both sides); `ApiDataProvider` owns error mapping.
 *
 * RBAC is server-enforced: `GET` is scoped to the caller (a citizen sees only
 * their own), `POST` is CITIZEN-only, `PATCH` is MoSPI/State/District-only.
 */
export const getWorkRecommendations = (signal?: AbortSignal): Promise<WorkRecommendation[]> =>
  apiClient.get('/recommendations', { signal });

export const postWorkRecommendation = (
  input: WorkRecommendationInput,
  signal?: AbortSignal,
): Promise<WorkRecommendation> => apiClient.post('/recommendations', input, { signal });

export const patchWorkRecommendationStatus = (
  id: string,
  patch: WorkRecommendationStatusPatch,
  signal?: AbortSignal,
): Promise<WorkRecommendation> => apiClient.patch(`/recommendations/${id}`, patch, { signal });
