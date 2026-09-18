import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { AttentionItem } from '../../../data';
import { useNotificationsService } from '../../../data';
import {
  DataTable,
  EmptyState,
  SendNoticeButton,
  Toast,
  ViewProjectLink,
  type Column,
} from '../../../ui';
import { formatINRCompact, workTitle } from '../../../format';
import { RiskCell } from '../RiskCell';

/**
 * Section 2 — the hero intelligence section. Surfaced by current financial /
 * data-quality indicators. Given the strongest visual emphasis.
 */
export function ProjectsRequiringAttention({ items }: { items: AttentionItem[] }) {
  const service = useNotificationsService();
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<{ message: string; tone: 'success' | 'danger' } | null>(
    null,
  );

  const sendNotice = async (sourceWorkId: number, label: string) => {
    setSendingId(sourceWorkId);
    try {
      await service.sendSlaNotice(sourceWorkId);
      setSentIds((prev) => new Set(prev).add(sourceWorkId));
      setNotice({
        message: `Attention notice sent to the District Authority for ${label}.`,
        tone: 'success',
      });
    } catch (err) {
      setNotice({
        message: err instanceof Error ? err.message : 'Could not send the notice.',
        tone: 'danger',
      });
    } finally {
      setSendingId(null);
    }
  };

  const columns: Column<AttentionItem>[] = useMemo(
    () => [
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
        render: ({ project }) => {
          const label = workTitle(project.workDescription, project.sourceWorkId);
          return (
            <div className="dash-attention__actions">
              <SendNoticeButton
                sending={sendingId === project.sourceWorkId}
                sent={sentIds.has(project.sourceWorkId)}
                onClick={() => void sendNotice(project.sourceWorkId, label)}
              />
              <ViewProjectLink id={project.sourceWorkId} label={label} />
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sendingId, sentIds],
  );

  return (
    <section className="dash-attention" aria-labelledby="dash-attention-heading">
      <div className="dash-attention__head">
        <h2 id="dash-attention-heading" className="dash-attention__title">
          Projects requiring attention
        </h2>
        <p className="dash-attention__lede">
          Works with the strongest financial and data-quality indicators, surfaced for further
          review.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No projects currently flagged"
          description="No work currently meets an attention threshold."
        />
      ) : (
        <>
          <DataTable
            caption="Projects requiring attention"
            columns={columns}
            rows={items}
            getRowKey={({ project }) => project.sourceWorkId}
          />
          <div className="dash-attention__foot">
            <Link className="ui-btn ui-btn--ghost ui-btn--sm" to="/projects">
              Open full register <span aria-hidden>→</span>
            </Link>
            <Link className="ui-btn ui-btn--ghost ui-btn--sm" to="/risk">
              Open risk queue <span aria-hidden>→</span>
            </Link>
          </div>
        </>
      )}

      {notice ? (
        <Toast
          key={notice.message}
          message={notice.message}
          tone={notice.tone}
          onDismiss={() => setNotice(null)}
        />
      ) : null}
    </section>
  );
}
