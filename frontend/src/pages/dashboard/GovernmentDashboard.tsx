import { useMemo, useState } from 'react';

import {
  filterDashboardView,
  useAsyncData,
  useDashboardService,
  type DashboardData,
} from '../../data';
import { applyGlobalFilters, GlobalFilterBar, globalFiltersActive, useGlobalFilters } from '../../filters';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../../ui';
import { FinancialIntelligence } from './sections/FinancialIntelligence';
import { NationalOverview } from './sections/NationalOverview';
import { ProjectsRequiringAttention } from './sections/ProjectsRequiringAttention';
import { RegionalInsight } from './sections/RegionalInsight';
import { RiskSignals } from './sections/RiskSignals';
import { WorkDistribution } from './sections/WorkDistribution';

/**
 * Government / MoSPI Intelligence Dashboard — the first product screen.
 *
 * Intelligence-first hierarchy: national metrics -> risk signals -> Projects
 * Requiring Attention (hero) -> financial intelligence -> work distribution ->
 * regional insight. The full project register lives on `/projects`; the risk
 * queue on `/risk` — the Overview only teases into them. Data comes exclusively
 * through {@link useDashboardService} -> DataProvider; this component does not
 * know whether the provider is demo or API.
 */
export function GovernmentDashboard() {
  const dashboardService = useDashboardService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData(
    (signal) => dashboardService.load(signal),
    [dashboardService, reloadKey],
    {
      isEmpty: (data) => data.projects.length === 0,
    },
  );

  return (
    <div className="ui-stack dash">
      <PageHeader
        title="Government Intelligence Dashboard"
        description="National monitoring and anomaly intelligence for MPLADS works."
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading dashboard" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="No work data available"
            description="The data provider returned no MPLADS work records for this dashboard."
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load the dashboard"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && <DashboardBody data={state.data} />}
    </div>
  );
}

const nfIN = new Intl.NumberFormat('en-IN');

function DashboardBody({ data }: { data: DashboardData }) {
  const { filters: globalFilters } = useGlobalFilters();

  // The whole dashboard (metrics, map, risk donut, attention list) reflects the
  // app-wide filter bar.
  const view = useMemo(
    () =>
      globalFiltersActive(globalFilters)
        ? filterDashboardView(data, applyGlobalFilters(data.projects, globalFilters))
        : data,
    [data, globalFilters],
  );

  return (
    <>
      <GlobalFilterBar
        options={{
          states: data.filterOptions.states,
          districts: data.filterOptions.districts,
          years: data.filterOptions.years,
        }}
        resultLabel={`${nfIN.format(view.totalWorks)} of ${nfIN.format(data.totalWorks)} works match`}
      />

      <NationalOverview data={view} />

      <RiskSignals data={view} />

      <ProjectsRequiringAttention items={view.attention} />

      <div className="dash-two-col">
        <FinancialIntelligence data={view} />
        <WorkDistribution data={view} />
      </div>

      <RegionalInsight regions={view.regions} />
    </>
  );
}
