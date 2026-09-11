import { useMemo, useState } from 'react';

import {
  filterDashboardView,
  useAsyncData,
  useDashboardService,
  type DashboardData,
} from '../../data';
import { applyGlobalFilters, GlobalFilterBar, globalFiltersActive, useGlobalFilters } from '../../filters';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../../ui';
import { AnomalyCards } from './sections/AnomalyCards';
import { FinancialIntelligence } from './sections/FinancialIntelligence';
import { NationalOverview } from './sections/NationalOverview';
import { ProjectsRequiringAttention } from './sections/ProjectsRequiringAttention';
import { RegionalInsight } from './sections/RegionalInsight';
import { RiskSignals } from './sections/RiskSignals';
import { WorkDistribution } from './sections/WorkDistribution';
import {setCache,getCached} from '../../cache/cache'
/**
 * Government / MoSPI Intelligence Dashboard — the first product screen.
 *
 * Mosaic layout: national metrics -> regional map + risk-level donut ->
 * financial intelligence + work distribution -> named anomaly cards -> Projects
 * Requiring Attention (hero teaser). The full project register lives on
 * `/projects`; the risk queue on `/risk` — the Overview only teases into them,
 * anomaly cards deep-link to `/risk?factor=`. Data comes exclusively
 * through {@link useDashboardService} -> DataProvider; this component does not
 * know whether the provider is demo or API.
 */
export function GovernmentDashboard() {
  const dashboardService = useDashboardService();
  const [reloadKey, setReloadKey] = useState(0);

  const loadDashboard = async (
    signal: AbortSignal,
  ): Promise<DashboardData> => {
    const key = 'dashboard';

    const cached = await getCached<DashboardData>(key);

    if (cached) {
      return cached;
    }

    const data = await dashboardService.load(signal);

    await setCache(key, data);

    return data;
  };

  const state = useAsyncData(
    loadDashboard,
    [dashboardService, reloadKey],
    {
      isEmpty: (data) => data.projects.length === 0,
    },
  );

  return (
    <div className="ui-stack dash">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Overview' }]}
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

      <div className="dash-grid">
        <div className="dash-grid__col dash-grid__col--8">
          <RegionalInsight regions={view.regions} />
        </div>
        <div className="dash-grid__col dash-grid__col--4">
          <RiskSignals data={view} showFactors={false} />
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-grid__col dash-grid__col--6">
          <FinancialIntelligence data={view} />
        </div>
        <div className="dash-grid__col dash-grid__col--6">
          <WorkDistribution data={view} />
        </div>
      </div>

      <AnomalyCards data={view} />

      <ProjectsRequiringAttention items={view.attention} />
    </>
  );
}
