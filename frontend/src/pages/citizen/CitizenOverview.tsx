import { useState } from 'react';

import { useAsyncData, useCitizenOverviewService, type CitizenOverviewData } from '../../data';
import { formatCount, formatINRCompact } from '../../format';
import {
  BarList,
  Card,
  EmptyState,
  ErrorState,
  IndiaLeafletMap,
  LoadingState,
  MetricCard,
  PageHeader,
  SectionHeader,
} from '../../ui';
import {
  CircleCheckIcon,
  ClipboardListIcon,
  LayoutGridIcon,
  MapPinIcon,
  RupeeIcon,
  TrendingUpIcon,
} from '../../ui/icons';

const TOP_LIST_LIMIT = 8;

function pct(value: number | null): string {
  return value == null ? '—' : `${Math.round(value)}%`;
}

/**
 * Citizen Transparency Overview (`/citizen/overview`) — a citizen-safe,
 * stripped-down counterpart to the Government Dashboard's national numbers.
 *
 * No risk donut, no anomaly cards, no "projects requiring attention" — those
 * are risk-derived and stay authority-only. Every figure here is a plain
 * roll-up of the same publicly releasable data the Citizen Portal list
 * already shows (see {@link useCitizenOverviewService}).
 */
export function CitizenOverview() {
  const service = useCitizenOverviewService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<CitizenOverviewData>(
    (signal) => service.load(signal),
    [service, reloadKey],
    { isEmpty: (data) => data.totalWorks === 0 },
  );

  return (
    <div className="ui-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Transparency Overview' }]}
        title="Transparency Overview"
        description="National figures for MPLADS works, built from the same publicly releasable data as the Citizen Portal — what was sanctioned, where, and its current status."
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading overview" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="No work data available"
            description="No MPLADS work records are available."
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load the overview"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && <OverviewBody data={state.data} />}
    </div>
  );
}

function OverviewBody({ data }: { data: CitizenOverviewData }) {
  const topStates = data.states.slice(0, TOP_LIST_LIMIT);

  return (
    <>
      <section aria-label="National overview">
        <SectionHeader title="National overview" icon={<LayoutGridIcon />} tone="info" />
        <div className="ui-metric-grid">
          <MetricCard
            icon={<LayoutGridIcon />}
            label="Total works"
            value={formatCount(data.totalWorks)}
            hint="MPLADS works tracked"
            tone="info"
          />
          <MetricCard
            icon={<ClipboardListIcon />}
            label="Recommended works"
            value={formatCount(data.recommendedWorks)}
            hint="Works at the recommended stage"
            tone="warning"
          />
          <MetricCard
            icon={<CircleCheckIcon />}
            label="Completed works"
            value={formatCount(data.completedWorks)}
            hint="Works at the completed stage"
            tone="success"
          />
          <MetricCard
            icon={<TrendingUpIcon />}
            label="Completion rate"
            value={pct(data.completionRatePct)}
            hint="Completed works ÷ total works"
          />
          <MetricCard
            icon={<RupeeIcon />}
            label="Sanctioned (total)"
            value={formatINRCompact(data.totalEstimatedCost)}
            hint="Estimated cost of works with an estimate"
            tone="warning"
          />
          <MetricCard
            icon={<RupeeIcon />}
            label="Recorded payments"
            value={formatINRCompact(data.totalRecordedPayments)}
            hint="Total recorded vendor payments"
          />
        </div>
      </section>

      <Card>
        <SectionHeader
          title="Works across India"
          description="Number of works per state in the current dataset. Hover a bubble for detail."
          icon={<MapPinIcon />}
          tone="info"
        />
        {data.states.length === 0 ? (
          <p className="risk-signals__note">No state information available.</p>
        ) : (
          <div className="dash-region">
            <div className="dash-region__map">
              <IndiaLeafletMap
                regions={data.states.map((s) => ({ state: s.state, works: s.works }))}
                ariaLabel="Map of MPLADS works per Indian state"
              />
            </div>
            <div className="dash-region__list">
              <h3 className="risk-signals__subtitle">Top states by number of works</h3>
              <BarList
                caption="Number of works per state"
                items={topStates.map((entry) => ({
                  label: entry.state,
                  value: entry.works,
                  valueLabel: formatCount(entry.works),
                  tone: 'brand',
                }))}
              />
            </div>
          </div>
        )}
      </Card>

      <p className="detail-note">
        This page presents publicly available information about MPLADS works — no risk
        assessment or investigation data is included here, or anywhere in the Citizen Portal.
      </p>
    </>
  );
}
