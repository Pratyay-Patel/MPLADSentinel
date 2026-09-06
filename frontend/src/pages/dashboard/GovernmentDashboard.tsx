import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  filterDashboardView,
  useAsyncData,
  useDashboardService,
  type DashboardData,
} from '../../data';
import { applyGlobalFilters, GlobalFilterBar, globalFiltersActive, useGlobalFilters } from '../../filters';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../../ui';
import { applyFilters, EMPTY_FILTERS, type DashboardFiltersState } from './filtering';
import { DashboardFilters } from './sections/DashboardFilters';
import { FinancialIntelligence } from './sections/FinancialIntelligence';
import { NationalOverview } from './sections/NationalOverview';
import { ProjectExploration } from './sections/ProjectExploration';
import { ProjectsRequiringAttention } from './sections/ProjectsRequiringAttention';
import { RegionalInsight } from './sections/RegionalInsight';
import { RiskSignals } from './sections/RiskSignals';
import { WorkDistribution } from './sections/WorkDistribution';

/**
 * Government / MoSPI Intelligence Dashboard — the first product screen.
 *
 * Intelligence-first hierarchy: national metrics -> Projects Requiring Attention
 * (hero) -> financial intelligence -> work distribution -> filters + project
 * exploration -> regional insight. Data comes exclusively through
 * {@link useDashboardService} -> DataProvider; this component does not know
 * whether the provider is demo or API.
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
  const [filters, setFilters] = useState<DashboardFiltersState>(EMPTY_FILTERS);

  // The whole dashboard (metrics, map, risk donut, attention list) reflects the
  // app-wide filter bar; the exploration table then applies its own extras.
  const view = useMemo(
    () =>
      globalFiltersActive(globalFilters)
        ? filterDashboardView(data, applyGlobalFilters(data.projects, globalFilters))
        : data,
    [data, globalFilters],
  );
  const explorationRows = useMemo(
    () => applyFilters(view.projects, filters),
    [view.projects, filters],
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

      <section className="ui-stack" aria-labelledby="dash-explore-heading">
        <div className="dash-explore-head">
          <h2 id="dash-explore-heading" className="dash-section-title">
            Project exploration
          </h2>
          <Link className="ui-btn ui-btn--ghost ui-btn--sm" to="/projects">
            Open full register <span aria-hidden>→</span>
          </Link>
        </div>
        <DashboardFilters
          filters={filters}
          options={view.filterOptions}
          onChange={setFilters}
          resultCount={explorationRows.length}
        />
        <ProjectExploration rows={explorationRows} risksByWorkId={view.risksByWorkId} />
      </section>

      <RegionalInsight regions={view.regions} />
    </>
  );
}
