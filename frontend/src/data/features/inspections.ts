import { workTitle } from '../../format';
import type { DataProvider } from '../DataProvider';
import type {
  AssignmentInput,
  AssignmentPatch,
  AssignmentStatus,
  FieldOfficer,
  InspectionAssignment,
  SignOffConfirmInput,
  SignOffRequestInput,
} from '../types';

/**
 * Feature service for the Inspections screen (`/inspections`).
 *
 * Composes `listAssignments` + `listFieldOfficers` (the assign dropdown) +
 * `listProjects` (the work picker), and forwards create / update.
 */

/** Assignment statuses in workflow order. */
export const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

/** How the workflow states read in the UI (the owner's wording). */
export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  ASSIGNED: 'Requested',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/** Statuses an authority may move an open assignment to (empty once closed). */
export function nextAssignmentStatuses(current: AssignmentStatus): AssignmentStatus[] {
  if (current === 'ASSIGNED') return ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (current === 'IN_PROGRESS') return ['COMPLETED', 'CANCELLED'];
  return [];
}

/** Field-evidence photo count bounds (mirrors the backend `required_photos` check). */
export const PHOTO_COUNT_MIN = 1;
export const PHOTO_COUNT_MAX = 20;
export const DEFAULT_REQUIRED_PHOTOS = 2;

/** Bound a photo count to [MIN, MAX]; non-numeric / empty → the default. */
export function clampPhotoCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REQUIRED_PHOTOS;
  return Math.max(PHOTO_COUNT_MIN, Math.min(PHOTO_COUNT_MAX, Math.round(value)));
}

export interface InspectionWorkOption {
  sourceWorkId: number;
  label: string;
  state: string | null;
}

export interface InspectionsData {
  assignments: InspectionAssignment[];
  officers: FieldOfficer[];
  /** Works that can be assigned, sorted by label. */
  works: InspectionWorkOption[];
}

export interface InspectionsService {
  load(signal?: AbortSignal): Promise<InspectionsData>;
  assign(input: AssignmentInput, signal?: AbortSignal): Promise<InspectionAssignment>;
  updateAssignment(
    id: string,
    patch: AssignmentPatch,
    signal?: AbortSignal,
  ): Promise<InspectionAssignment>;
  /** Dual-authority sign-off, step 1 — request completing/cancelling. */
  requestSignOff(
    id: string,
    input: SignOffRequestInput,
    signal?: AbortSignal,
  ): Promise<InspectionAssignment>;
  /** Dual-authority sign-off, step 2 — a different authority confirms. */
  confirmSignOff(
    id: string,
    input: SignOffConfirmInput,
    signal?: AbortSignal,
  ): Promise<InspectionAssignment>;
}

export function createInspectionsService(provider: DataProvider): InspectionsService {
  return {
    async load(signal) {
      const [assignments, officers, projects] = await Promise.all([
        provider.listAssignments(signal),
        provider.listFieldOfficers(signal),
        provider.listProjects(signal),
      ]);
      const works: InspectionWorkOption[] = projects
        .map((p) => ({
          sourceWorkId: p.sourceWorkId,
          label: workTitle(p.workDescription, p.sourceWorkId),
          state: p.state,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      return { assignments, officers, works };
    },
    assign: (input, signal) => provider.createAssignment(input, signal),
    updateAssignment: (id, patch, signal) => provider.updateAssignment(id, patch, signal),
    requestSignOff: (id, input, signal) => provider.requestAssignmentSignOff(id, input, signal),
    confirmSignOff: (id, input, signal) => provider.confirmAssignmentSignOff(id, input, signal),
  };
}
