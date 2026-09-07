import { workTitle } from '../../format';
import type { DataProvider } from '../DataProvider';
import type {
  AssignmentInput,
  AssignmentPatch,
  AssignmentStatus,
  FieldOfficer,
  InspectionAssignment,
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
  };
}
