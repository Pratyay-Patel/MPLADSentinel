import type { DataProvider } from '../DataProvider';
import type { PaymentInstallment, Project } from '../types';

/**
 * Feature-level service for the Project Details screen (`/projects/:id`).
 *
 * Composes `getProject` + `getProjectPayments` from the injected DataProvider.
 * The screen never touches a provider, the API client, or fixtures directly.
 */
export interface ProjectDetailData {
  project: Project;
  /** Installment rows; empty unless `project.paymentDataState === 'FETCHED_PRESENT'`. */
  payments: PaymentInstallment[];
}

export interface ProjectDetailService {
  /** Resolves to `null` when no work has the given id (not an error). */
  load(sourceWorkId: number, signal?: AbortSignal): Promise<ProjectDetailData | null>;
}

export function createProjectDetailService(provider: DataProvider): ProjectDetailService {
  return {
    async load(sourceWorkId, signal) {
      const project = await provider.getProject(sourceWorkId, signal);
      if (!project) {
        return null;
      }
      const payments =
        project.paymentDataState === 'FETCHED_PRESENT'
          ? await provider.getProjectPayments(sourceWorkId, signal)
          : [];
      return { project, payments };
    },
  };
}
