import { deriveRisk } from '../risk/rules';
import type { DataProvider } from '../DataProvider';
import { ProviderError } from '../errors';
import { toPublicProject } from '../publicProject';
import type {
  BackendHealth,
  Grievance,
  GrievanceInput,
  GrievanceStatusPatch,
  LifecycleState,
  Money,
  PaymentDataState,
  Project,
  ProjectSummary,
} from '../types';
import { demoPaymentsByWorkId, demoProjects, RISK_REFERENCE_DATE } from './fixtures';

/**
 * Grievances submitted during this browser session. Not persisted — a reload
 * clears them. The real backend endpoint (Phase 3B) replaces this.
 */
const demoGrievances: Grievance[] = [];
let grievanceSeq = 0;

const LIFECYCLE_STATES: LifecycleState[] = [
  'RECOMMENDED',
  'COMPLETED',
  'RECOMMENDED_AND_COMPLETED',
];
const PAYMENT_STATES: PaymentDataState[] = [
  'NOT_FETCHED',
  'FETCHED_PRESENT',
  'FETCHED_ABSENT',
  'FETCH_ERROR',
];

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
}

function zeroed<K extends string>(keys: readonly K[]): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const key of keys) {
    out[key] = 0;
  }
  return out;
}

function sumMoney(values: (Money | null)[]): Money {
  return {
    amount: values.reduce((total, m) => total + (m?.amount ?? 0), 0),
    currency: 'INR',
  };
}

function buildSummary(projects: readonly Project[]): ProjectSummary {
  const byLifecycleState = zeroed(LIFECYCLE_STATES);
  const byPaymentDataState = zeroed(PAYMENT_STATES);
  for (const p of projects) {
    byLifecycleState[p.lifecycleState] += 1;
    byPaymentDataState[p.paymentDataState] += 1;
  }
  return {
    totalProjects: projects.length,
    byLifecycleState,
    byPaymentDataState,
    totalEstimatedCost: sumMoney(projects.map((p) => p.estimatedCost)),
    totalRecordedPayments: sumMoney(projects.map((p) => p.recordedPayments)),
  };
}

/**
 * Serves the {@link ./fixtures} demo data. Async so it is a drop-in for the
 * ApiDataProvider — a screen cannot tell which one it is talking to.
 */
export function createDemoDataProvider(): DataProvider {
  return {
    source: 'demo',

    async getBackendHealth(signal) {
      ensureNotAborted(signal);
      const health: BackendHealth = { status: 'DEMO', service: 'demo-data-provider' };
      return health;
    },

    async listProjects(signal) {
      ensureNotAborted(signal);
      return demoProjects.map((p) => ({ ...p, dataQualityFlags: [...p.dataQualityFlags] }));
    },

    async getProject(sourceWorkId, signal) {
      ensureNotAborted(signal);
      const found = demoProjects.find((p) => p.sourceWorkId === sourceWorkId);
      return found ? { ...found, dataQualityFlags: [...found.dataQualityFlags] } : null;
    },

    async listPublicProjects(signal) {
      ensureNotAborted(signal);
      return demoProjects.map(toPublicProject);
    },

    async getPublicProject(reference, signal) {
      ensureNotAborted(signal);
      const found = demoProjects.find((p) => p.sourceWorkId === reference);
      return found ? toPublicProject(found) : null;
    },

    async getProjectSummary(signal) {
      ensureNotAborted(signal);
      return buildSummary(demoProjects);
    },

    async getProjectRisk(sourceWorkId, signal) {
      ensureNotAborted(signal);
      const project = demoProjects.find((p) => p.sourceWorkId === sourceWorkId);
      if (!project) {
        return null;
      }
      return deriveRisk(project, {
        allProjects: [...demoProjects],
        asOf: RISK_REFERENCE_DATE,
      });
    },

    async getProjectPayments(sourceWorkId, signal) {
      ensureNotAborted(signal);
      const rows = demoPaymentsByWorkId.get(sourceWorkId) ?? [];
      return rows.map((row) => ({ ...row }));
    },

    async listGrievances(signal) {
      ensureNotAborted(signal);
      return demoGrievances.map((g) => ({ ...g }));
    },

    async submitGrievance(input: GrievanceInput, signal) {
      ensureNotAborted(signal);
      grievanceSeq += 1;
      const now = new Date().toISOString();
      const grievance: Grievance = {
        ...input,
        id: `demo-grievance-${grievanceSeq}`,
        submittedAt: now,
        status: 'SUBMITTED',
        actionNote: null,
        updatedAt: now,
      };
      demoGrievances.unshift(grievance);
      return { ...grievance };
    },

    async updateGrievanceStatus(id: string, patch: GrievanceStatusPatch, signal) {
      ensureNotAborted(signal);
      const grievance = demoGrievances.find((g) => g.id === id);
      if (!grievance) {
        throw new ProviderError('unknown', `No grievance with id ${id}.`);
      }
      grievance.status = patch.status;
      if (patch.actionNote !== undefined) {
        grievance.actionNote = patch.actionNote;
      }
      grievance.updatedAt = new Date().toISOString();
      return { ...grievance };
    },
  };
}
