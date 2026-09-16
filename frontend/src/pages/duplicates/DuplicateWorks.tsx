import { useMemo, useState } from 'react';

import {
  useAsyncData,
  useDuplicatesService,
  type DuplicateConfidence,
  type DuplicatePair,
  type DuplicateWorkSummary,
} from '../../data';
import { formatINRCompact, workTitle } from '../../format';
import {
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
  ViewProjectLink,
  type Column,
  type StatusTone,
} from '../../ui';
import './duplicates.css';

const CONFIDENCE_TONE: Record<DuplicateConfidence, StatusTone> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'neutral',
};

const CONFIDENCE_OPTIONS: DuplicateConfidence[] = ['HIGH', 'MEDIUM', 'LOW'];

function ConfidenceBadge({ confidence }: { confidence: DuplicateConfidence }) {
  return (
    <StatusBadge tone={CONFIDENCE_TONE[confidence]} srLabel="Match confidence">
      {confidence}
    </StatusBadge>
  );
}

function WorkCell({ work }: { work: DuplicateWorkSummary }) {
  const label = workTitle(work.workDescription, work.sourceWorkId);
  const cost =
    work.estimatedCost != null ? { amount: work.estimatedCost, currency: 'INR' } : null;
  return (
    <div className="dup-cell">
      <span className="dup-cell__title">{label}</span>
      <span className="dup-cell__sub">
        #{work.sourceWorkId} · {formatINRCompact(cost)}
      </span>
      <ViewProjectLink id={work.sourceWorkId} label={label} />
    </div>
  );
}

/**
 * De-duplication of Works (`/duplicates`, requirements F7, decision D35).
 * Lists candidate duplicate pairs — works in the same state, district and
 * category whose description text and/or estimated cost look like the same
 * physical work listed or sanctioned more than once. Rule-based and
 * deterministic, same style as Risk & Alerts (D22); these are investigation
 * indicators, never proof that two records are actually the same work. Data
 * comes via `useDuplicatesService()` → DataProvider.
 */
export function DuplicateWorks() {
  const service = useDuplicatesService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<DuplicatePair[]>(
    (signal) => service.load(signal),
    [service, reloadKey],
    { isEmpty: (data) => data.length === 0 },
  );

  return (
    <div className="ui-stack dup">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Duplicate Works' }]}
        title="Duplicate Works"
        description="Pairs of ingested works that look like the same physical project listed or sanctioned more than once — same state, district and category, plus a near-identical description and/or overlapping estimated cost. Indicators for review, not proof of duplication."
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Comparing works" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="No candidate duplicates found"
            description="No two works in the same state, district and category matched closely enough to flag."
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load duplicate-work data"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && <DuplicateWorksBody pairs={state.data} />}
    </div>
  );
}

function DuplicateWorksBody({ pairs }: { pairs: DuplicatePair[] }) {
  const [confidence, setConfidence] = useState<'' | DuplicateConfidence>('');

  const filtered = useMemo(
    () => (confidence ? pairs.filter((p) => p.confidence === confidence) : pairs),
    [pairs, confidence],
  );
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.score - a.score), [filtered]);

  const columns: Column<DuplicatePair>[] = [
    { key: 'workA', header: 'Work A', render: (p) => <WorkCell work={p.workA} /> },
    { key: 'workB', header: 'Work B', render: (p) => <WorkCell work={p.workB} /> },
    {
      key: 'location',
      header: 'Location / category',
      render: (p) =>
        [p.workA.state, p.workA.district, p.workA.category].filter(Boolean).join(' · ') || '—',
    },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (p) => <ConfidenceBadge confidence={p.confidence} />,
    },
    {
      key: 'reasons',
      header: 'Reasons',
      render: (p) => (
        <ul className="dup-reasons">
          {p.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <Card>
      <div className="dup-filters" role="search" aria-label="Filter duplicate pairs">
        <Select
          label="Confidence"
          value={confidence}
          options={[
            { value: '', label: 'All confidence levels' },
            ...CONFIDENCE_OPTIONS.map((c) => ({ value: c, label: c })),
          ]}
          onChange={(e) => setConfidence(e.target.value as '' | DuplicateConfidence)}
        />
        <span className="text-muted">
          {sorted.length} of {pairs.length} {pairs.length === 1 ? 'pair' : 'pairs'}
        </span>
      </div>

      <DataTable
        caption="Candidate duplicate work pairs"
        columns={columns}
        rows={sorted}
        pageSize={25}
        getRowKey={(p) => `${p.workA.sourceWorkId}-${p.workB.sourceWorkId}`}
        emptyState={
          <EmptyState
            title="No pairs match this filter"
            description="Try a different confidence level."
          />
        }
      />
    </Card>
  );
}
