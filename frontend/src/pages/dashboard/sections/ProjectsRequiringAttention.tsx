import type { AttentionItem } from '../../../data';
import { DataTable, EmptyState, ViewProjectLink, type Column } from '../../../ui';
import { formatINRCompact, workTitle } from '../../../format';
import { RiskCell } from '../RiskCell';

const columns: Column<AttentionItem>[] = [
  {
    key: 'project',
    header: 'Project',
    render: ({ project }) => (
      <div className="dash-cell-primary">
        <span className="dash-cell-primary__title">
          {workTitle(project.workDescription, project.sourceWorkId)}
        </span>
        <span className="dash-cell-primary__sub">
          {project.category ?? '—'} · #{project.sourceWorkId}
        </span>
      </div>
    ),
  },
  {
    key: 'location',
    header: 'Location',
    render: ({ project }) => (
      <div className="dash-cell-stack">
        <span>{project.state ?? '—'}</span>
        <span className="text-muted">{project.district ?? '—'}</span>
      </div>
    ),
  },
  {
    key: 'estimated',
    header: 'Est. cost',
    align: 'right',
    render: ({ project }) => formatINRCompact(project.estimatedCost),
  },
  {
    key: 'payments',
    header: 'Recorded payments',
    align: 'right',
    render: ({ project }) =>
      project.paymentDataState === 'FETCHED_PRESENT'
        ? formatINRCompact(project.recordedPayments)
        : '—',
  },
  {
    key: 'risk',
    header: 'Risk',
    render: ({ risk }) => <RiskCell risk={risk} showHeadline />,
  },
  {
    key: 'action',
    header: 'Action',
    align: 'right',
    render: ({ project }) => (
      <ViewProjectLink id={project.sourceWorkId} label={workTitle(project.workDescription, project.sourceWorkId)} />
    ),
  },
];

/**
 * Section 2 — the hero intelligence section. Surfaced by current financial /
 * data-driven demo indicators (no ML). Given the strongest visual emphasis.
 */
export function ProjectsRequiringAttention({ items }: { items: AttentionItem[] }) {
  return (
    <section className="dash-attention" aria-labelledby="dash-attention-heading">
      <div className="dash-attention__head">
        <h2 id="dash-attention-heading" className="dash-attention__title">
          Projects requiring attention
        </h2>
        <p className="dash-attention__lede">
          Projects surfaced by current financial and data-quality indicators for further review.
          Indicators are rule-based signals over the available work data, not an ML model.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No projects currently flagged"
          description="No demo project meets an attention indicator threshold."
        />
      ) : (
        <DataTable
          caption="Projects requiring attention"
          columns={columns}
          rows={items}
          getRowKey={({ project }) => project.sourceWorkId}
        />
      )}
    </section>
  );
}
