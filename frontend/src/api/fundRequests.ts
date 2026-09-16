import type { FundRequest, FundRequestInput } from '../data/types';
import { apiClient } from './client';

/**
 * Backend calls for the Escrow & Fund Control API. Response JSON matches the
 * `FundRequest` domain type (`id` is a string on both sides); `ApiDataProvider`
 * owns error mapping.
 *
 * RBAC is server-enforced: `GET` is DISTRICT/MOSPI-only, scoped to the caller
 * for a District Officer (they see only their own); `POST /fund-requests` is
 * DISTRICT-only; `POST /fund-requests/{id}/release-notice` is MOSPI-only.
 */
export const getFundRequests = (signal?: AbortSignal): Promise<FundRequest[]> =>
  apiClient.get('/fund-requests', { signal });

export const getFundRequest = (id: string, signal?: AbortSignal): Promise<FundRequest> =>
  apiClient.get(`/fund-requests/${id}`, { signal });

export const postFundRequest = (
  input: FundRequestInput,
  signal?: AbortSignal,
): Promise<FundRequest> => apiClient.post('/fund-requests', input, { signal });

export const postFundReleaseNotice = (id: string, signal?: AbortSignal): Promise<FundRequest> =>
  apiClient.post(`/fund-requests/${id}/release-notice`, undefined, { signal });
