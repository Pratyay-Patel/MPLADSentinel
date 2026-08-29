import { ApiError } from '../../api/client';
import { getHealth } from '../../api/health';
import type { DataProvider } from '../DataProvider';
import { ProviderError } from '../errors';
import type { BackendHealth } from '../types';

/** The one operation with a real backend endpoint today. */
async function fetchBackendHealth(signal?: AbortSignal): Promise<BackendHealth> {
  try {
    const response = await getHealth(signal);
    return { status: response.status, service: response.service };
  } catch (error) {
    if (error instanceof ApiError) {
      const kind = error.status === 0 ? 'network' : 'unavailable';
      throw new ProviderError(kind, `Backend health check failed: ${error.message}`, {
        cause: error,
      });
    }
    throw new ProviderError('unknown', 'Backend health check failed', { cause: error });
  }
}

/** Rejects for every operation whose backend endpoint is a later phase. */
function notImplemented(operation: string): never {
  throw new ProviderError(
    'notImplemented',
    `${operation} has no backend endpoint yet — implemented in a later phase (Phase 3B / REST APIs). ` +
      `Use DATA_SOURCE=demo for now.`,
  );
}

/**
 * Serves real data through the centralized API client (`src/api/client.ts`). The
 * browser therefore only ever talks to the Spring Boot backend, never PostgreSQL
 * or an external MPLADS/Empowered Indian API.
 *
 * Only {@link DataProvider.getBackendHealth} is wired today; the project / summary
 * / risk endpoints do not exist yet, so those methods reject with a
 * `ProviderError` of kind `notImplemented` rather than calling a fake endpoint.
 */
export function createApiDataProvider(): DataProvider {
  return {
    source: 'api',

    getBackendHealth: (signal) => fetchBackendHealth(signal),

    // No backend endpoint yet — parameters are intentionally omitted (a function
    // with fewer params still satisfies the interface).
    listProjects: () => Promise.resolve().then(() => notImplemented('listProjects')),
    getProject: () => Promise.resolve().then(() => notImplemented('getProject')),
    getProjectSummary: () => Promise.resolve().then(() => notImplemented('getProjectSummary')),
    getProjectRisk: () => Promise.resolve().then(() => notImplemented('getProjectRisk')),
  };
}
