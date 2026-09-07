import type { Project, ProjectRisk } from '../data';
import type { CsvColumn } from './csv';

/** A work + its risk view model — the row shape both the register and risk tables carry. */
export interface WorkExportRow {
  project: Project;
  risk: ProjectRisk;
}

/** Which slice of the current (already filtered) rows to export. */
export type ExportScope = 'all' | 'completed' | 'recommended';

export const EXPORT_SCOPE_LABEL: Record<ExportScope, string> = {
  all: 'All shown works',
  completed: 'Completed works only',
  recommended: 'Recommended works only',
};

/** Narrow rows by lifecycle stage for the scoped export options. */
export function scopeWorks<T extends WorkExportRow>(rows: readonly T[], scope: ExportScope): T[] {
  if (scope === 'completed') return rows.filter((r) => r.project.seenInCompleted);
  if (scope === 'recommended') return rows.filter((r) => r.project.seenInRecommended);
  return [...rows];
}

const LIFECYCLE_LABEL: Record<Project['lifecycleState'], string> = {
  RECOMMENDED: 'Recommended',
  COMPLETED: 'Completed',
  RECOMMENDED_AND_COMPLETED: 'Recommended + completed',
};

/**
 * Fixed column set for a works export. Money columns are the raw rupee amount
 * (no symbol/grouping) so the file stays spreadsheet-friendly; the risk columns
 * are the same derived indicators shown in the UI.
 */
export const workCsvColumns: CsvColumn<WorkExportRow>[] = [
  { header: 'Work ID', value: (r) => r.project.sourceWorkId },
  { header: 'Description', value: (r) => r.project.workDescription },
  { header: 'Category', value: (r) => r.project.category },
  { header: 'State', value: (r) => r.project.state },
  { header: 'District', value: (r) => r.project.district },
  { header: 'Member of Parliament', value: (r) => r.project.mpName },
  { header: 'House', value: (r) => r.project.house },
  { header: 'Constituency', value: (r) => r.project.constituency },
  { header: 'Lifecycle', value: (r) => LIFECYCLE_LABEL[r.project.lifecycleState] },
  { header: 'Estimated cost (INR)', value: (r) => r.project.estimatedCost?.amount ?? '' },
  { header: 'Final cost (INR)', value: (r) => r.project.finalCost?.amount ?? '' },
  { header: 'Recorded payments (INR)', value: (r) => r.project.recordedPayments?.amount ?? '' },
  { header: 'Risk level', value: (r) => r.risk.level },
  { header: 'Risk score', value: (r) => r.risk.score ?? '' },
  { header: 'Risk indicators', value: (r) => r.risk.reasons.join('; ') },
];
