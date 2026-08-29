import { ApiError } from '../../api/client';
import { getHealth } from '../../api/health';
import {
  getPublicWork,
  getPublicWorks,
  getWork,
  getWorkPayments,
  getWorks,
  getWorksSummary,
} from '../../api/works';
import type { DataProvider } from '../DataProvider';
import { ProviderError } from '../errors';
import type { BackendHealth, Project } from '../types';

/** Maps a failed API call onto the ProviderError kinds the UI understands. */
function toProviderError(operation: string, error: unknown): ProviderError {
  if (error instanceof ApiError) {
    const kind = error.status === 0 ? 'network' : 'unavailable';
    return new ProviderError(kind, `${operation} failed: ${error.message}`, { cause: error });
  }
  return new ProviderError('unknown', `${operation} failed`, { cause: error });
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Defensive normalisation for a work row — the backend shape already matches. */
function normalizeProject(project: Project): Project {
  return { ...project, dataQualityFlags: project.dataQualityFlags ?? [] };
}

/** Rejects for every operation whose backend endpoint is a later phase. */
function notImplemented(operation: string): never {
  throw new ProviderError(
    'notImplemented',
    `${operation} has no backend endpoint yet — implemented in a later phase. Use DATA_SOURCE=demo for now.`,
  );
}

/**
 * Serves real data through the centralized API client (`src/api/*`). The browser
 * therefore only ever talks to the Spring Boot backend, never PostgreSQL or an
 * external MPLADS/Empowered Indian API.
 *
 * Wired today (Phase B2): backend health and the works read APIs — `listProjects`
 * / `getProject` / `getProjectSummary` / `getProjectPayments` (authority) and
 * `listPublicProjects` / `getPublicProject` (citizen-safe). `getProjectRisk`
 * (Phase B3) and the grievance methods (Phase B4) still reject with a
 * `notImplemented` `ProviderError`.
 */
export function createApiDataProvider(): DataProvider {
  return {
    source: 'api',

    async getBackendHealth(signal) {
      try {
        const response = await getHealth(signal);
        const health: BackendHealth = { status: response.status, service: response.service };
        return health;
      } catch (error) {
        throw toProviderError('Backend health check', error);
      }
    },

    async listProjects(signal) {
      try {
        return (await getWorks(signal)).map(normalizeProject);
      } catch (error) {
        throw toProviderError('listProjects', error);
      }
    },

    async getProject(sourceWorkId, signal) {
      try {
        return normalizeProject(await getWork(sourceWorkId, signal));
      } catch (error) {
        if (isNotFound(error)) return null;
        throw toProviderError('getProject', error);
      }
    },

    async getProjectSummary(signal) {
      try {
        return await getWorksSummary(signal);
      } catch (error) {
        throw toProviderError('getProjectSummary', error);
      }
    },

    async getProjectPayments(sourceWorkId, signal) {
      try {
        return await getWorkPayments(sourceWorkId, signal);
      } catch (error) {
        if (isNotFound(error)) return [];
        throw toProviderError('getProjectPayments', error);
      }
    },

    async listPublicProjects(signal) {
      try {
        return await getPublicWorks(signal);
      } catch (error) {
        throw toProviderError('listPublicProjects', error);
      }
    },

    async getPublicProject(reference, signal) {
      try {
        return await getPublicWork(reference, signal);
      } catch (error) {
        if (isNotFound(error)) return null;
        throw toProviderError('getPublicProject', error);
      }
    },

    // --- not yet wired -------------------------------------------------

    getProjectRisk: () => Promise.resolve().then(() => notImplemented('getProjectRisk')),
    listGrievances: () => Promise.resolve().then(() => notImplemented('listGrievances')),
    submitGrievance: () => Promise.resolve().then(() => notImplemented('submitGrievance')),
    updateGrievanceStatus: () =>
      Promise.resolve().then(() => notImplemented('updateGrievanceStatus')),
  };
}
