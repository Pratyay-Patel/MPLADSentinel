import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  useAsyncData,
  useMpComparisonService,
  type MpComparisonData,
  type MpStat,
} from '../../data';
import { formatCount, formatINRCompact } from '../../format';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  SearchInput,
  Select,
  SectionHeader,
} from '../../ui';
import { MpCompareChart } from './MpCompareChart';
import { METRICS, pct, type Metric } from './metrics';

const MAX_MPS = 4;
const HOUSE_LABEL: Record<string, string> = { LOK_SABHA: 'Lok Sabha', RAJYA_SABHA: 'Rajya Sabha' };

function sumMoney(mps: MpStat[], pick: (m: MpStat) => number): string {
  return formatINRCompact({ amount: mps.reduce((s, m) => s + pick(m), 0), currency: 'INR' });
}

export function CompareMps() {
  const service = useMpComparisonService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<MpComparisonData>(
    (signal) => service.load(signal),
    [service, reloadKey],
    { isEmpty: (data) => data.mps.length === 0 },
  );

  return (
    <div className="ui-stack mpc">
      <PageHeader
        title="Compare MPs"
        description="Side-by-side activity and spending for up to four Members of Parliament, aggregated from their recorded works."
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading MPs" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="No MP data"
            description="The data provider returned no works with a Member of Parliament recorded."
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load MP data"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && <CompareBody data={state.data} />}
    </div>
  );
}

function CompareBody({ data }: { data: MpComparisonData }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [metricKey, setMetricKey] = useState(METRICS[0].key);

  const byId = useMemo(() => new Map(data.mps.map((m) => [m.id, m])), [data.mps]);

  const selected = useMemo(
    () =>
      searchParams
        .getAll('mp')
        .map((id) => byId.get(id))
        .filter((m): m is MpStat => m != null)
        .slice(0, MAX_MPS),
    [searchParams, byId],
  );
  const setSelected = (ids: string[]) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('mp');
        for (const id of ids.slice(0, MAX_MPS)) next.append('mp', id);
        return next;
      },
      { replace: true },
    );
  };
  const addMp = (id: string) => setSelected([...selected.map((m) => m.id), id]);
  const removeMp = (id: string) => setSelected(selected.filter((m) => m.id !== id).map((m) => m.id));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const chosen = new Set(selected.map((m) => m.id));
    const pool = data.mps.filter((m) => !chosen.has(m.id));
    const matched = q
      ? pool.filter(
          (m) =>
            m.mpName.toLowerCase().includes(q) ||
            m.constituency?.toLowerCase().includes(q) ||
            m.state?.toLowerCase().includes(q),
        )
      : pool;
    return matched.slice(0, 25);
  }, [query, data.mps, selected]);

  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];
  const atCapacity = selected.length >= MAX_MPS;

  return (
    <>
      <Card>
        <SectionHeader
          title="Choose MPs"
          description={`Add up to ${MAX_MPS}. Type to search by name, constituency or state.`}
        />

        {selected.length > 0 && (
          <ul className="mpc-chips">
            {selected.map((m) => (
              <li key={m.id} className="mpc-chip">
                <span>{m.mpName}</span>
                <button
                  type="button"
                  className="mpc-chip__x"
                  aria-label={`Remove ${m.mpName}`}
                  onClick={() => removeMp(m.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {atCapacity ? (
          <p className="mpc-note">Four MPs selected — remove one to add another.</p>
        ) : (
          <>
            <SearchInput
              label="Search MPs"
              placeholder="Search by name, constituency or state…"
              value={query}
              onValueChange={setQuery}
            />
            {query.trim() === '' ? (
              <p className="mpc-note">
                Start typing to find an MP. {formatCount(data.mps.length)} MPs have recorded works.
              </p>
            ) : (
              <ul className="mpc-results">
                {results.length === 0 ? (
                  <li className="mpc-note">No MPs match “{query.trim()}”.</li>
                ) : (
                  results.map((m) => (
                    <li key={m.id}>
                      <button type="button" className="mpc-result" onClick={() => addMp(m.id)}>
                        <span className="mpc-result__name">{m.mpName}</span>
                        <span className="mpc-result__meta">
                          {[m.constituency, m.state].filter(Boolean).join(' · ') || '—'} ·{' '}
                          {formatCount(m.works)} works
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </>
        )}
      </Card>

      {selected.length < 2 ? (
        <Card>
          <EmptyState
            title="Pick at least two MPs"
            description="Add two or more MPs above to see the comparison."
          />
        </Card>
      ) : (
        <Comparison
          selected={selected}
          allMps={data.mps}
          metric={metric}
          metricKey={metricKey}
          onMetric={setMetricKey}
        />
      )}
    </>
  );
}

function Comparison({
  selected,
  allMps,
  metric,
  metricKey,
  onMetric,
}: {
  selected: MpStat[];
  allMps: MpStat[];
  metric: Metric;
  metricKey: string;
  onMetric: (key: string) => void;
}) {
  const rows: { label: string; cell: (m: MpStat) => string }[] = [
    { label: 'Total works', cell: (m) => formatCount(m.works) },
    { label: 'Recommended works', cell: (m) => formatCount(m.recommended) },
    { label: 'Completed works', cell: (m) => formatCount(m.completed) },
    { label: 'Completion rate', cell: (m) => pct(m.completionRate) },
    { label: 'Σ estimated cost', cell: (m) => formatINRCompact(m.estimatedCost) },
    { label: 'Σ recorded payments', cell: (m) => formatINRCompact(m.recordedPayments) },
    { label: 'Recorded payments ÷ estimated cost', cell: (m) => pct(m.paymentsToEstimateRatio) },
    { label: 'HIGH-risk works', cell: (m) => formatCount(m.risk.HIGH) },
    { label: 'MEDIUM-risk works', cell: (m) => formatCount(m.risk.MEDIUM) },
    { label: 'LOW-risk works', cell: (m) => formatCount(m.risk.LOW) },
    { label: 'Not assessed', cell: (m) => formatCount(m.risk.UNKNOWN) },
    {
      label: 'Average risk score',
      cell: (m) => (m.avgRiskScore == null ? '—' : m.avgRiskScore.toFixed(1)),
    },
  ];

  const mostWorks = [...selected].sort((a, b) => b.works - a.works)[0];
  const bestCompletion = [...selected]
    .filter((m) => m.completionRate != null)
    .sort((a, b) => (b.completionRate ?? 0) - (a.completionRate ?? 0))[0];
  const lowestFlagged = [...selected]
    .filter((m) => m.flaggedShare != null)
    .sort((a, b) => (a.flaggedShare ?? 0) - (b.flaggedShare ?? 0))[0];

  return (
    <>
      <div className="ui-metric-grid">
        <MetricCard label="MPs compared" value={formatCount(selected.length)} />
        <MetricCard
          label="Combined works"
          value={formatCount(selected.reduce((s, m) => s + m.works, 0))}
          hint={`${formatCount(selected.reduce((s, m) => s + m.completed, 0))} completed`}
        />
        <MetricCard
          label="Combined recorded payments"
          value={sumMoney(selected, (m) => m.recordedPayments.amount)}
          hint={`of ${sumMoney(selected, (m) => m.estimatedCost.amount)} estimated`}
        />
      </div>

      <Card>
        <SectionHeader
          title="Metric comparison"
          description="One bar per selected MP; the dashed line is the average across all MPs."
        />
        <div className="mpc-metric-pick">
          <Select
            label="Metric"
            value={metricKey}
            options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
            onChange={(e) => onMetric(e.target.value)}
          />
        </div>
        <MpCompareChart selected={selected} allMps={allMps} metric={metric} />
      </Card>

      <Card>
        <SectionHeader title="Detailed comparison" />
        <div className="mpc-table-wrap">
          <table className="mpc-table">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                {selected.map((m) => (
                  <th key={m.id} scope="col">
                    <span className="mpc-table__mp">{m.mpName}</span>
                    <span className="mpc-table__sub">
                      {[m.house ? HOUSE_LABEL[m.house] : null, m.constituency].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {selected.map((m) => (
                    <td key={m.id}>{row.cell(m)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mpc-note">
          Aggregated from each MP's recorded works. “Σ estimated cost” sums the recommended
          estimates; “Σ recorded payments” sums the vendor payments ingested so far (not every
          work has payment data yet). Risk levels are rule-based indicators, not proof of
          wrongdoing.
        </p>
      </Card>

      <div className="ui-metric-grid">
        <MetricCard
          label="Most works"
          value={mostWorks.mpName}
          hint={`${formatCount(mostWorks.works)} works recorded`}
        />
        <MetricCard
          label="Highest completion rate"
          value={bestCompletion ? bestCompletion.mpName : '—'}
          hint={bestCompletion ? pct(bestCompletion.completionRate) : 'No recommended works'}
        />
        <MetricCard
          label="Lowest flagged share"
          value={lowestFlagged ? lowestFlagged.mpName : '—'}
          hint={lowestFlagged ? `${pct(lowestFlagged.flaggedShare)} HIGH + MEDIUM` : 'Nothing assessed'}
        />
      </div>
    </>
  );
}
