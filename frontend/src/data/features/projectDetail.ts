import type { DataProvider } from '../DataProvider';
import type { PaymentInstallment, Project, ProjectRisk } from '../types';

/**
 * Feature-level service for the Project Details screen (`/projects/:id`).
 *
 * Composes `getProject` + `getProjectPayments` + `getProjectRisk` from the
 * injected DataProvider. The screen never touches a provider, the API client, or
 * fixtures directly.
 */
export interface ProjectDetailData {
  project: Project;
  /** Installment rows; empty unless `project.paymentDataState === 'FETCHED_PRESENT'`. */
  payments: PaymentInstallment[];
  /** Risk view model; `UNKNOWN` when it cannot be assessed or the risk call fails. */
  risk: ProjectRisk;
}

export interface ProjectDetailService {
  /** Resolves to `null` when no work has the given id (not an error). */
  load(sourceWorkId: number, signal?: AbortSignal): Promise<ProjectDetailData | null>;
}

function unknownRisk(sourceWorkId: number): ProjectRisk {
  return { sourceWorkId, level: 'UNKNOWN', score: null, reasons: [], assessedAt: null };
}

export function createProjectDetailService(provider: DataProvider): ProjectDetailService {
  return {
    async load(sourceWorkId, signal) {
      const project = await provider.getProject(sourceWorkId, signal);
      if (!project) {
        return null;
      }

      const [payments, risk] = await Promise.all([
        project.paymentDataState === 'FETCHED_PRESENT'
          ? provider.getProjectPayments(sourceWorkId, signal)
          : Promise.resolve<PaymentInstallment[]>([]),
        provider
          .getProjectRisk(sourceWorkId, signal)
          .then((r) => r ?? unknownRisk(sourceWorkId))
          .catch(() => unknownRisk(sourceWorkId)),
      ]);

      return { project, payments, risk };
    },
  };
}
