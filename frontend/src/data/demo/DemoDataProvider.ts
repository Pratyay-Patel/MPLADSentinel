import { workTitle } from '../../format';
import { deriveRisk } from '../risk/rules';
import type { DataProvider } from '../DataProvider';
import { ProviderError } from '../errors';
import { toPublicProject } from '../publicProject';
import type {
  AssignmentStatus,
  BackendHealth,
  FieldOfficer,
  Grievance,
  GrievanceInput,
  GrievanceStatusPatch,
  InspectionAssignment,
  LifecycleState,
  Money,
  PaymentDataState,
  Project,
  ProjectRisk,
  ProjectSummary,
} from '../types';
import { demoPaymentsByWorkId, demoProjects, RISK_REFERENCE_DATE } from './fixtures';

/**
 * Grievances submitted during this browser session. Not persisted — a reload
 * clears them. The real backend endpoint (Phase 3B) replaces this.
 */
const demoGrievances: Grievance[] = [];
let grievanceSeq = 0;

// --- inspection assignments (session-only, like grievances) -----------------

const demoFieldOfficers: FieldOfficer[] = [
  { officerCode: 'OFF101', name: 'Amit Patil', phone: '+91 98200 10101' },
  { officerCode: 'OFF102', name: 'Rahul Sharma', phone: '+91 98200 10102' },
  { officerCode: 'OFF103', name: 'Priya Deshmukh', phone: '+91 98200 10103' },
  { officerCode: 'OFF104', name: 'Sneha Iyer', phone: '+91 98200 10104' },
  { officerCode: 'OFF105', name: 'Vikram Rao', phone: '+91 98200 10105' },
];

const OPEN_ASSIGNMENT_STATUSES: AssignmentStatus[] = ['ASSIGNED', 'IN_PROGRESS'];

function isoAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
function isoDateAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Bound a requested photo count to the same 1–20 range the backend enforces. */
function clampPhotos(value: number): number {
  return Math.max(1, Math.min(20, Math.round(value) || 2));
}

function assignmentTransitionOk(from: AssignmentStatus, to: AssignmentStatus): boolean {
  if (from === to) return true;
  if (from === 'ASSIGNED') return to === 'IN_PROGRESS' || to === 'COMPLETED' || to === 'CANCELLED';
  if (from === 'IN_PROGRESS') return to === 'COMPLETED' || to === 'CANCELLED';
  return false;
}

function seedAssignments(): InspectionAssignment[] {
  const officer = (code: string) =>
    demoFieldOfficers.find((o) => o.officerCode === code) ?? demoFieldOfficers[0];
  const mk = (
    n: number,
    projectIndex: number,
    code: string,
    status: AssignmentStatus,
    assignedDaysAgo: number,
    updatedDaysAgo: number,
    note: string | null,
    dueDate: string | null,
    requiredPhotos: number,
  ): InspectionAssignment => {
    const project = demoProjects[projectIndex % demoProjects.length];
    const o = officer(code);
    return {
      id: `demo-assignment-${n}`,
      sourceWorkId: project.sourceWorkId,
      workTitle: workTitle(project.workDescription, project.sourceWorkId),
      officerCode: o.officerCode,
      officerName: o.name,
      assignedByName: 'MoSPI / Ministry',
      status,
      dueDate,
      note,
      requiredPhotos,
      assignedAt: isoAgo(assignedDaysAgo),
      updatedAt: isoAgo(updatedDaysAgo),
    };
  };
  return [
    mk(1, 0, 'OFF102', 'COMPLETED', 12, 4, 'Verify reported progress against the site.', null, 3),
    mk(2, 1, 'OFF101', 'IN_PROGRESS', 6, 2, 'Check materials on site.', isoDateAhead(4), 2),
    mk(3, 2, 'OFF103', 'ASSIGNED', 2, 2, null, isoDateAhead(9), 4),
  ];
}

let demoAssignments: InspectionAssignment[] = seedAssignments();
let assignmentSeq = demoAssignments.length;

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

    async listProjectRisks(signal) {
      ensureNotAborted(signal);
      const ctx = { allProjects: [...demoProjects], asOf: RISK_REFERENCE_DATE };
      const byWorkId: Record<number, ProjectRisk> = {};
      for (const project of demoProjects) {
        byWorkId[project.sourceWorkId] = deriveRisk(project, ctx);
      }
      return byWorkId;
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

    async listFieldOfficers(signal) {
      ensureNotAborted(signal);
      return demoFieldOfficers.map((o) => ({ ...o }));
    },

    async listAssignments(signal) {
      ensureNotAborted(signal);
      return demoAssignments
        .map((a) => ({ ...a }))
        .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
    },

    async createAssignment(input, signal) {
      ensureNotAborted(signal);
      const officer = demoFieldOfficers.find((o) => o.officerCode === input.officerCode);
      if (!officer) {
        throw new ProviderError('unknown', `Unknown field officer: ${input.officerCode}.`);
      }
      const alreadyOpen = demoAssignments.some(
        (a) =>
          a.sourceWorkId === input.sourceWorkId &&
          a.officerCode === officer.officerCode &&
          OPEN_ASSIGNMENT_STATUSES.includes(a.status),
      );
      if (alreadyOpen) {
        throw new ProviderError(
          'unknown',
          `${officer.officerCode} already has an open assignment for this work.`,
        );
      }
      const project = demoProjects.find((p) => p.sourceWorkId === input.sourceWorkId);
      assignmentSeq += 1;
      const now = new Date().toISOString();
      const assignment: InspectionAssignment = {
        id: `demo-assignment-${assignmentSeq}`,
        sourceWorkId: input.sourceWorkId,
        workTitle: project
          ? workTitle(project.workDescription, project.sourceWorkId)
          : `Work #${input.sourceWorkId}`,
        officerCode: officer.officerCode,
        officerName: officer.name,
        assignedByName: 'MoSPI / Ministry',
        status: 'ASSIGNED',
        dueDate: input.dueDate,
        note: input.note,
        requiredPhotos: clampPhotos(input.requiredPhotos),
        assignedAt: now,
        updatedAt: now,
      };
      demoAssignments = [assignment, ...demoAssignments];
      return { ...assignment };
    },

    async updateAssignment(id, patch, signal) {
      ensureNotAborted(signal);
      const assignment = demoAssignments.find((a) => a.id === id);
      if (!assignment) {
        throw new ProviderError('unknown', `No assignment with id ${id}.`);
      }
      if (patch.status && patch.status !== assignment.status) {
        if (!assignmentTransitionOk(assignment.status, patch.status)) {
          throw new ProviderError(
            'unknown',
            `Cannot move an assignment from ${assignment.status} to ${patch.status}.`,
          );
        }
        assignment.status = patch.status;
      }
      if (patch.dueDate !== undefined && patch.dueDate !== null) {
        assignment.dueDate = patch.dueDate;
      }
      if (patch.note !== undefined && patch.note !== null) {
        assignment.note = patch.note;
      }
      if (patch.requiredPhotos !== undefined && patch.requiredPhotos !== null) {
        assignment.requiredPhotos = clampPhotos(patch.requiredPhotos);
      }
      assignment.updatedAt = new Date().toISOString();
      return { ...assignment };
    },

    async getAuditPhotos(_sourceWorkId, _limit, signal) {
      ensureNotAborted(signal);
      // The demo provider has no Pinata credential; the real evidence lookup is
      // backend-only (`api` mode). `configured: false` makes the Audit page show
      // a "not connected" note rather than an error.
      return { photos: [], configured: false };
    },
  };
}
