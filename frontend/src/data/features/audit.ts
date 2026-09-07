import type { DataProvider } from '../DataProvider';
import type { AuditEvidence, InspectionAssignment } from '../types';

/**
 * Feature service for the Audit Trail screen (`/audit`).
 *
 * The trail is work-level: every work that has an inspection assignment gets a
 * chronological timeline built from that assignment's lifecycle, plus the
 * field-evidence images fetched from the backend (Pinata, `api` mode only).
 *
 * Demo boundary (see `docs/inspections-audit-feature.md`): no inspection JSON
 * reaches the portal yet, so the "Inspection completed" event's contents are the
 * illustrative constants below — shown for any assignment whose status is
 * `COMPLETED`. The assignment / evidence parts are real.
 */

export interface InspectionFinding {
  label: string;
  value: boolean;
}

/** Illustrative field-inspection findings shown for a COMPLETED assignment. */
export const DEMO_INSPECTION_FINDINGS: InspectionFinding[] = [
  { label: 'Work visible', value: true },
  { label: 'Reported stage matches', value: true },
  { label: 'Project operational', value: false },
  { label: 'Materials present', value: true },
  { label: 'Site accessible', value: true },
];
export const DEMO_OVERALL_CONDITION = 'GOOD';
export const DEMO_INSPECTION_REMARKS = 'Construction is approximately 70% complete.';

export interface AuditWorkGroup {
  sourceWorkId: number;
  title: string;
  officerCode: string | null;
  officerName: string | null;
  /** Assignments for this work, newest first. */
  assignments: InspectionAssignment[];
  /** The assignment the timeline is built from (the most recent). */
  latest: InspectionAssignment;
}

export interface AuditData {
  /** Works with at least one assignment, most recent activity first. */
  works: AuditWorkGroup[];
}

export interface AuditService {
  load(signal?: AbortSignal): Promise<AuditData>;
  /** `limit` = the assignment's `requiredPhotos`; omit for the backend default. */
  evidence(sourceWorkId: number, limit?: number, signal?: AbortSignal): Promise<AuditEvidence>;
}

export function createAuditService(provider: DataProvider): AuditService {
  return {
    async load(signal) {
      const assignments = await provider.listAssignments(signal);

      const byWork = new Map<number, InspectionAssignment[]>();
      for (const assignment of assignments) {
        const list = byWork.get(assignment.sourceWorkId);
        if (list) list.push(assignment);
        else byWork.set(assignment.sourceWorkId, [assignment]);
      }

      const works: AuditWorkGroup[] = [...byWork.entries()]
        .map(([sourceWorkId, list]) => {
          const sorted = [...list].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
          const latest = sorted[0];
          return {
            sourceWorkId,
            title: latest.workTitle,
            officerCode: latest.officerCode,
            officerName: latest.officerName,
            assignments: sorted,
            latest,
          };
        })
        .sort((a, b) => b.latest.updatedAt.localeCompare(a.latest.updatedAt));

      return { works };
    },
    evidence: (sourceWorkId, limit, signal) =>
      provider.getAuditPhotos(sourceWorkId, limit, signal),
  };
}
