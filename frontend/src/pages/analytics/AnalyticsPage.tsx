import { useMemo, useState } from 'react';

import {
  useAnalyticsService,
  useAsyncData,
  type AnalyticsData,
  type MpUtilisation,
  type UtilisationBand,
} from '../../data';
import { formatCount, formatINRCompact } from '../../format';
import {
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  SectionHeader,
  Select,
  StatusBadge,
  type Column,
  type StatusTone,
} from '../../ui';
import {
  CircleCheckIcon,
  LayoutGridIcon,
  RupeeIcon,
  TrendingUpIcon,
} from '../../ui/icons';
import { BandLegend, StateUtilisationChart, UtilisationBandsChart } from './charts';
import './analytics.css';

const BAND_TONE: Record<UtilisationBand, StatusTone> = {
  High: 'success',
  Good: 'info',
  Moderate: 'warning',
  Low: 'danger',
};

const BAND_OPTIONS = [
  { value: '', label: 'All bands' },
  { value: 'High', label: 'High (85%+)' },
  { value: 'Good', label: 'Good (70–84%)' },
  { value: 'Moderate', label: 'Moderate (50–69%)' },
  { value: 'Low', label: 'Low (below 50%)' },
];

function BandSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: '' | UtilisationBand;
  onChange: (band: '' | UtilisationBand) => void;
}) {
  return (
    <Select
      label={label}
      value={value}
      options={BAND_OPTIONS}
      onChange={(e) => onChange(e.target.value as '' | UtilisationBand)}
    />
  );
}

/**
 * Fund & Utilisation Analytics (`/analytics`). Sanction / disbursement /
 * utilisation patterns across states and MPs. Data via {@link useAnalyticsService}
 * → DataProvider; the page never touches fixtures or the API client directly.
 */
export function AnalyticsPage() {
  const service = useAnalyticsService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<AnalyticsData>(
    (signal) => service.load(signal),
    [service, reloadKey],
    { isEmpty: (data) => data.totalWorks === 0 },
  );

  return (
    <div className="ui-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Analytics' }]}
        title="Fund & Utilisation Analytics"
        description="Sanction, disbursement and utilisation patterns across states, constituencies and Members of Parliament."
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Aggregating works" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="No work data available"
            description="The data provider returned no MPLADS work records to analyse."
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load analytics"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && <AnalyticsBody data={state.data} />}
    </div>
  );
}

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

function AnalyticsBody({ data }: { data: AnalyticsData }) {
  return (
    <>
      <div className="ui-metric-grid">
        <MetricCard
          icon={<LayoutGridIcon />}
          label="Works analysed"
          value={formatCount(data.totalWorks)}
          hint="MPLADS works in the dataset"
        />
        <MetricCard
          icon={<RupeeIcon />}
          label="Sanctioned (total)"
          value={formatINRCompact(data.sanctionedTotal)}
          hint="Estimated cost of works with an estimate"
        />
        <MetricCard
          icon={<RupeeIcon />}
          label="Recorded payments"
          value={formatINRCompact(data.recordedPaymentsTotal)}
          hint={`Across ${formatCount(data.worksWithPayments)} works with payment records`}
        />
        <MetricCard
          icon={<TrendingUpIcon />}
          label="Recorded utilisation"
          value={pct(data.recordedUtilisationPct)}
          hint="Payments ÷ sanctioned, over works with both known"
        />
        <MetricCard
          icon={<CircleCheckIcon />}
          label="Completed vs not"
          value={`${formatCount(data.completedWorks)} / ${formatCount(data.notCompletedWorks)}`}
          hint="Seen in the completed listing vs not yet"
        />
      </div>

      <StatesUtilisationCard data={data} />

      <div className="an-two-col">
        <Card>
          <SectionHeader
            title="MPs by utilisation band"
            description="Share of the MPs analysed in each recorded-utilisation band."
          />
          {data.mpsAnalysed === 0 ? (
            <EmptyState
              title="No MP-level scored works"
              description="No works with both an estimate and a payment record could be attributed to a named MP."
            />
          ) : (
            <>
              <UtilisationBandsChart buckets={data.buckets} />
              <BandLegend />
              <p className="an-chart-foot">
                Based on {formatCount(data.mpsAnalysed)}{' '}
                {data.mpsAnalysed === 1 ? 'MP' : 'MPs'} with attributable scored works.
              </p>
            </>
          )}
        </Card>

        <Card>
          <SectionHeader
            title="Data-derived observations"
            description="Computed from the figures above — descriptive, not policy findings."
          />
          {data.observations.length === 0 ? (
            <p className="text-muted">Not enough data for observations.</p>
          ) : (
            <ul className="an-observations">
              {data.observations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <MpLeaderboard mps={data.mps} />

      <p className="an-note">
        Utilisation here is <em>recorded</em> payments from the secondary data source, not
        audited expenditure. A work with no payment record is treated as unknown, never as
        zero spend.
      </p>
    </>
  );
}

function StatesUtilisationCard({ data }: { data: AnalyticsData }) {
  const [band, setBand] = useState<'' | UtilisationBand>('');
  const states = useMemo(
    () => (band ? data.states.filter((s) => s.band === band) : data.states),
    [data.states, band],
  );

  return (
    <Card>
      <SectionHeader
        title="States & UTs by recorded fund utilisation"
        description="Recorded payments as a share of sanctioned cost, over works where both the estimate and a payment are known. Bars are coloured by band; scroll for more."
      />
      {data.states.length === 0 ? (
        <EmptyState
          title="No state-level scored works"
          description="No works in this dataset have both an estimate and a payment record, so utilisation cannot be computed by state."
        />
      ) : (
        <>
          <div className="an-filter-row">
            <BandSelect label="Filter states by band" value={band} onChange={setBand} />
            <span className="text-muted">
              {formatCount(states.length)} of {formatCount(data.states.length)} states &amp; UTs
            </span>
          </div>
          {states.length === 0 ? (
            <EmptyState
              title="No states in this band"
              description="Choose a different band or clear the filter."
            />
          ) : (
            <>
              <StateUtilisationChart states={states} />
              <BandLegend />
            </>
          )}
          <p className="an-chart-foot">
            {data.topState ? (
              <>
                Highest: <strong>{data.topState.state}</strong> ({pct(data.topState.utilisationPct)})
                {' · '}
              </>
            ) : null}
            Average {pct(data.avgStateUtilisationPct)} across {data.statesAnalysed}{' '}
            {data.statesAnalysed === 1 ? 'state/UT' : 'states & UTs'} with scored works.
          </p>
        </>
      )}
    </Card>
  );
}

const mpColumns: Column<MpUtilisation>[] = [
  {
    key: 'mp',
    header: 'Member of Parliament',
    render: (m) => (
      <div className="an-mp-cell">
        <span className="an-mp-cell__name">{m.mpName}</span>
        <span className="an-mp-cell__sub">
          {[m.constituency, m.state].filter(Boolean).join(' · ') || '—'}
        </span>
      </div>
    ),
  },
  { key: 'works', header: 'Works', align: 'right', render: (m) => formatCount(m.works) },
  {
    key: 'sanctioned',
    header: 'Sanctioned (scored)',
    align: 'right',
    render: (m) => formatINRCompact({ amount: m.sanctioned, currency: 'INR' }),
  },
  {
    key: 'spent',
    header: 'Recorded payments',
    align: 'right',
    render: (m) => formatINRCompact({ amount: m.spent, currency: 'INR' }),
  },
  {
    key: 'util',
    header: 'Utilisation',
    align: 'right',
    render: (m) => `${Math.round(m.utilisationPct)}%`,
  },
  {
    key: 'band',
    header: 'Band',
    render: (m) => (
      <StatusBadge tone={BAND_TONE[m.band]} srLabel="Utilisation band">
        {m.band}
      </StatusBadge>
    ),
  },
];

function MpLeaderboard({ mps }: { mps: MpUtilisation[] }) {
  const [band, setBand] = useState<'' | UtilisationBand>('');
  const rows = useMemo(() => (band ? mps.filter((m) => m.band === band) : mps), [mps, band]);

  return (
    <Card>
      <SectionHeader
        title="MP fund-utilisation leaderboard"
        description="Every MP with at least one scored work, best recorded utilisation first. This is the per-MP detail behind the band chart above."
      />
      {mps.length === 0 ? (
        <EmptyState
          title="No MP-level scored works"
          description="No works with both an estimate and a payment record could be attributed to a named MP."
        />
      ) : (
        <>
          <div className="an-filter-row">
            <BandSelect label="Filter MPs by band" value={band} onChange={setBand} />
            <span className="text-muted">
              {formatCount(rows.length)} of {formatCount(mps.length)} MPs
            </span>
          </div>
          <DataTable
            caption="MP fund-utilisation leaderboard"
            columns={mpColumns}
            rows={rows}
            pageSize={15}
            getRowKey={(m) => m.mpName}
            emptyState={
              <EmptyState
                title="No MPs in this band"
                description="Choose a different band or clear the filter."
              />
            }
          />
        </>
      )}
    </Card>
  );
}
