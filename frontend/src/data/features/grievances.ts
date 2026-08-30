import { workTitle } from '../../format';
import type { DataProvider } from '../DataProvider';
import type { Grievance, GrievanceInput, GrievanceStatus, GrievanceStatusPatch } from '../types';

/**
 * Feature service for the Grievances screen (`/grievances`).
 *
 * Composes `listGrievances` + `listProjects` (for the "related work" picker) and
 * forwards `submitGrievance`. In the current phase the DemoDataProvider stores
 * grievances in memory for the session; the ApiDataProvider rejects with
 * `notImplemented` until the backend endpoint exists.
 */
export const GRIEVANCE_CATEGORIES = [
  'Quality of work',
  'Delay in execution',
  'Work not started',
  'Suspected misuse of funds',
  'Wrong location or beneficiary',
  'Other',
] as const;

/** Review states, in workflow order. Authorities move a grievance forward. */
export const GRIEVANCE_STATUSES: GrievanceStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ACTIONED',
  'CLOSED',
];

export const GRIEVANCE_STATUS_LABEL: Record<GrievanceStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  ACTIONED: 'Actioned',
  CLOSED: 'Closed',
};

export interface GrievanceWorkOption {
  reference: number;
  label: string;
}

export interface GrievancesData {
  grievances: Grievance[];
  /** Works a grievance can be linked to, for the optional picker. */
  workOptions: GrievanceWorkOption[];
}

export interface GrievancesService {
  load(signal?: AbortSignal): Promise<GrievancesData>;
  submit(input: GrievanceInput, signal?: AbortSignal): Promise<Grievance>;
  updateStatus(id: string, patch: GrievanceStatusPatch, signal?: AbortSignal): Promise<Grievance>;
}

export function createGrievancesService(provider: DataProvider): GrievancesService {
  return {
    async load(signal) {
      const [grievances, projects] = await Promise.all([
        provider.listGrievances(signal),
        provider.listProjects(signal),
      ]);
      const workOptions: GrievanceWorkOption[] = projects
        .map((p) => ({
          reference: p.sourceWorkId,
          label: workTitle(p.workDescription, p.sourceWorkId),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      return { grievances, workOptions };
    },
    submit: (input, signal) => provider.submitGrievance(input, signal),
    updateStatus: (id, patch, signal) => provider.updateGrievanceStatus(id, patch, signal),
  };
}
