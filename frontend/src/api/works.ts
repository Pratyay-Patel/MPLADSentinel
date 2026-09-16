import type { PublicProject } from '../data/publicProject';
import type {
  DuplicatePair,
  PaymentInstallment,
  Project,
  ProjectRisk,
  ProjectSummary,
} from '../data/types';
import { apiClient } from './client';

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
  apiClient.get('/works', { signal });

export const getWork = (sourceWorkId: number, signal?: AbortSignal): Promise<Project> =>
  apiClient.get(`/works/${sourceWorkId}`, { signal });

export const getWorksSummary = (signal?: AbortSignal): Promise<ProjectSummary> =>
  apiClient.get('/works/summary', { signal });

export const getWorkPayments = (
  sourceWorkId: number,
  signal?: AbortSignal,
): Promise<PaymentInstallment[]> => apiClient.get(`/works/${sourceWorkId}/payments`, { signal });

export const getPublicWorks = (signal?: AbortSignal): Promise<PublicProject[]> =>
  apiClient.get('/public/works', { signal });

export const getPublicWork = (
  reference: number,
  signal?: AbortSignal,
): Promise<PublicProject> => apiClient.get(`/public/works/${reference}`, { signal });

// --- risk (Phase B3, authority-only) --------------------------------

/** Every work's risk assessment — the list screens call this once. */
export const getWorksRisk = (signal?: AbortSignal): Promise<ProjectRisk[]> =>
  apiClient.get('/works/risk', { signal });

export const getWorkRisk = (
  sourceWorkId: number,
  signal?: AbortSignal,
): Promise<ProjectRisk> => apiClient.get(`/works/${sourceWorkId}/risk`, { signal });

// --- de-duplication of works (F7, decision D35, authority-only) ----

/** Every candidate duplicate pair across all ingested works. */
export const getWorkDuplicates = (signal?: AbortSignal): Promise<DuplicatePair[]> =>
  apiClient.get('/works/duplicates', { signal });
