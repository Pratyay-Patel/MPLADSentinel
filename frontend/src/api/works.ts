import type { PublicProject } from '../data/publicProject';
import type { PaymentInstallment, Project, ProjectRisk, ProjectSummary } from '../data/types';
import { apiClient } from './client';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

function getPage<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  return apiClient.get<PageResponse<T>>(path, { signal }).then((page) => page.content);
}

/**
 * Backend calls for the works read APIs (Phase B2). The response JSON is shaped
 * to match the domain types field-for-field, so the transport type is the
 * domain type; {@link ../data/api/ApiDataProvider} still owns error mapping and
 * light null-normalisation.
 *
 * `/works/*` is authority-only on the backend; `/public/works/*` is the
 * citizen-safe projection.
 */
export const getWorks = (signal?: AbortSignal): Promise<Project[]> =>
  getPage('/works', signal);

export const getWork = (sourceWorkId: number, signal?: AbortSignal): Promise<Project> =>
  apiClient.get(`/works/${sourceWorkId}`, { signal });

export const getWorksSummary = (signal?: AbortSignal): Promise<ProjectSummary> =>
  apiClient.get('/works/summary', { signal });

export const getWorkPayments = (
  sourceWorkId: number,
  signal?: AbortSignal,
): Promise<PaymentInstallment[]> => getPage(`/works/${sourceWorkId}/payments`, signal);

export const getPublicWorks = (signal?: AbortSignal): Promise<PublicProject[]> =>
  getPage('/public/works', signal);

export const getPublicWork = (
  reference: number,
  signal?: AbortSignal,
): Promise<PublicProject> => apiClient.get(`/public/works/${reference}`, { signal });

// --- risk (Phase B3, authority-only) --------------------------------

/** Every work's risk assessment — the list screens call this once. */
export const getWorksRisk = (signal?: AbortSignal): Promise<ProjectRisk[]> =>
  getPage('/works/risk', signal);

export const getWorkRisk = (
  sourceWorkId: number,
  signal?: AbortSignal,
): Promise<ProjectRisk> => apiClient.get(`/works/${sourceWorkId}/risk`, { signal });
