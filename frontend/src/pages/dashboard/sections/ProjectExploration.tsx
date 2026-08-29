import type { Project, ProjectRisk } from '../../../data';
import { DataTable, EmptyState, StatusBadge, type Column, type StatusTone } from '../../../ui';
import { formatINRCompact } from '../../../format';
import { RiskCell } from '../RiskCell';
import { ViewProjectLink } from '../ViewProjectLink';

const LIFECYCLE_TONE: Record<Project['lifecycleState'], StatusTone> = {
  RECOMMENDED: 'info',
  COMPLETED: 'success',
  RECOMMENDED_AND_COMPLETED: 'normal',
};

const LIFECYCLE_LABEL: Record<Project['lifecycleState'], string> = {
  RECOMMENDED: 'Recommended',
  COMPLETED: 'Completed',
  RECOMMENDED_AND_COMPLETED: 'Recommended + completed',
};

export interface ProjectExplorationProps {
  rows: Project[];
  risksByWorkId: Record<number, ProjectRisk>;
}

/**
 * Section (dashboard-level) — a compact project exploration table over the
 * client-side-filtered demo dataset. NOT the full Project Intelligence page: no
 * server pagination, no backend filtering.
 */
export function ProjectExploration({ rows, risksByWorkId }: ProjectExplorationProps) {
  const columns: Column<Project>[] = [
    {
      key: 'project',
      header: 'Project',
      render: (project) => (
        <div className="dash-cell-primary">
          <span className="dash-cell-primary__title">
            {project.workDescription ?? `Work ${project.sourceWorkId}`}
          </span>
          <span className="dash-cell-primary__sub">#{project.sourceWorkId}</span>
        </div>
      ),
    },
    { key: 'state', header: 'State', render: (p) => p.state ?? '—' },
    { key: 'district', header: 'District', render: (p) => p.district ?? '—' },
    { key: 'category', header: 'Category', render: (p) => p.category ?? '—' },
    {
      key: 'estimated',
      header: 'Est. cost',
      align: 'right',
      render: (p) => formatINRCompact(p.estimatedCost),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <StatusBadge tone={LIFECYCLE_TONE[p.lifecycleState]} srLabel="Status">
          {LIFECYCLE_LABEL[p.lifecycleState]}
        </StatusBadge>
      ),
    },
    {
      key: 'risk',
      header: 'Risk',
      render: (p) => <RiskCell risk={risksByWorkId[p.sourceWorkId]} />,
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (project) => <ViewProjectLink project={project} />,
    },
  ];

  return (
    <DataTable
      caption="Project exploration"
      columns={columns}
      rows={rows}
      getRowKey={(project) => project.sourceWorkId}
      emptyState={
        <EmptyState
          title="No projects match the current filters"
          description="Adjust or clear the filters above to see more works."
        />
      }
    />
  );
}
