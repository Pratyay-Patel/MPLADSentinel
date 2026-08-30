import { ApiError } from '../../api/client';
import { getGrievances, patchGrievanceStatus, postGrievance } from '../../api/grievances';
import { getHealth } from '../../api/health';
import {
  getPublicWork,
  getPublicWorks,
  getWork,
  getWorkPayments,
  getWorkRisk,
  getWorks,
  getWorksRisk,
  getWorksSummary,
} from '../../api/works';
import type { DataProvider } from '../DataProvider';
import { ProviderError } from '../errors';
import type { BackendHealth, Project, ProjectRisk } from '../types';

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

/**
 * Serves real data through the centralized API client (`src/api/*`). The browser
 * therefore only ever talks to the Spring Boot backend, never PostgreSQL or an
 * external MPLADS/Empowered Indian API.
 *
 * Every `DataProvider` method is wired to a real endpoint: health, the works
 * read APIs (authority + citizen-safe), the risk APIs (B3) and the grievance
 * APIs (B4). Failures become a {@link ProviderError} whose `kind` the UI
 * branches on.
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

    async getProjectRisk(sourceWorkId, signal) {
      try {
        return await getWorkRisk(sourceWorkId, signal);
      } catch (error) {
        if (isNotFound(error)) return null;
        throw toProviderError('getProjectRisk', error);
      }
    },

    async listProjectRisks(signal) {
      try {
        const rows = await getWorksRisk(signal);
        const byWorkId: Record<number, ProjectRisk> = {};
        for (const row of rows) {
          byWorkId[row.sourceWorkId] = row;
        }
        return byWorkId;
      } catch (error) {
        throw toProviderError('listProjectRisks', error);
      }
    },

    async listGrievances(signal) {
      try {
        return await getGrievances(signal);
      } catch (error) {
        throw toProviderError('listGrievances', error);
      }
    },

    async submitGrievance(input, signal) {
      try {
        return await postGrievance(input, signal);
      } catch (error) {
        throw toProviderError('submitGrievance', error);
      }
    },

    async updateGrievanceStatus(id, patch, signal) {
      try {
        return await patchGrievanceStatus(id, patch, signal);
      } catch (error) {
        throw toProviderError('updateGrievanceStatus', error);
      }
    },
  };
}
