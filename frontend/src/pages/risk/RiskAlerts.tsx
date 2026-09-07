import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  useAsyncData,
  useRiskService,
  type RiskListData,
  type RiskLevel,
  type RiskRow,
} from '../../data';
import {
  downloadCsv,
  ExportMenu,
  filenameSlug,
  scopeWorks,
  toCsv,
  workCsvColumns,
  type ExportScope,
} from '../../export';
import {
  applyGlobalFiltersBy,
  GlobalFilterBar,
  globalFilterOptions,
  useGlobalFilters,
} from '../../filters';
import { formatINRCompact, workTitle } from '../../format';
import {
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  RiskLevelBadge,
  SearchInput,
  Select,
  StatusBadge,
  ViewProjectLink,
  type Column,
  type StatusTone,
} from '../../ui';

const LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

const LIFECYCLE_TONE: Record<RiskRow['project']['lifecycleState'], StatusTone> = {
  RECOMMENDED: 'info',
  COMPLETED: 'success',
  RECOMMENDED_AND_COMPLETED: 'normal',
};
const LIFECYCLE_LABEL: Record<RiskRow['project']['lifecycleState'], string> = {
  RECOMMENDED: 'Recommended',
  COMPLETED: 'Completed',
  RECOMMENDED_AND_COMPLETED: 'Recommended + completed',
};

interface RiskFilters {
  level: '' | RiskLevel;
  category: string;
  search: string;
}

const EMPTY_FILTERS: RiskFilters = { level: '', category: '', search: '' };

/** Seed the risk-level filter from `?level=` (used by the voice command bar;
 *  `?state=` is handled by the global filter bar). */
function filtersFromParams(params: URLSearchParams): RiskFilters {
  const level = params.get('level')?.toUpperCase() ?? '';
  return {
    ...EMPTY_FILTERS,
    level: (LEVELS as string[]).includes(level) ? (level as RiskLevel) : '',
  };
}

function filterRows(rows: RiskRow[], filters: RiskFilters): RiskRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter(({ project, risk }) => {
    if (filters.level && risk.level !== filters.level) return false;
    if (filters.category && project.category !== filters.category) return false;
    if (search) {
      const haystack = [
        project.workDescription,
        project.mpName,
        project.state,
        project.district,
        project.category,
        String(project.sourceWorkId),
        ...risk.reasons,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function IndicatorList({ row }: { row: RiskRow }) {
  if (row.risk.level === 'UNKNOWN') {
    return <span className="text-muted">Not enough data to assess</span>;
  }
  if (row.risk.reasons.length === 0) {
    return <span className="text-muted">No current indicators</span>;
  }
  return (
    <ul className="risk-reasons">
      {row.risk.reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
  );
}

const columns: Column<RiskRow>[] = [
  {
    key: 'project',
    header: 'Project',
    render: ({ project }) => (
      <div className="dash-cell-primary">
        <span className="dash-cell-primary__title">
          {workTitle(project.workDescription, project.sourceWorkId)}
        </span>
        <span className="dash-cell-primary__sub">
          {[project.state, project.district].filter(Boolean).join(' · ')} · #{project.sourceWorkId}
        </span>
      </div>
    ),
  },
  { key: 'category', header: 'Category', render: ({ project }) => project.category ?? '—' },
  {
    key: 'estimated',
    header: 'Est. cost',
    align: 'right',
    render: ({ project }) => formatINRCompact(project.estimatedCost),
  },
  {
    key: 'status',
    header: 'Status',
    render: ({ project }) => (
      <StatusBadge tone={LIFECYCLE_TONE[project.lifecycleState]} srLabel="Status">
        {LIFECYCLE_LABEL[project.lifecycleState]}
      </StatusBadge>
    ),
  },
  {
    key: 'risk',
    header: 'Risk',
    render: ({ risk }) => (
      <span className="risk-cell">
        <RiskLevelBadge level={risk.level} />
        {risk.score != null ? <span className="risk-cell__score">score {risk.score}</span> : null}
      </span>
    ),
  },
  { key: 'indicators', header: 'Indicators', render: (row) => <IndicatorList row={row} /> },
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
 * Risk & Alerts (`/risk`) — every work with a risk level, most severe first,
 * with the actual rule-based indicators for each. Rules are computed from
 * financial and data-quality signals over the available work data
 * (`src/data/risk/rules.ts`) — not an ML model; the Round-1 risk engine runs
 * server-side. Data comes via `useRiskService()` → DataProvider.
 */
export function RiskAlerts() {
  const service = useRiskService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<RiskListData>((signal) => service.load(signal), [service, reloadKey], {
    isEmpty: (data) => data.rows.length === 0,
  });

  return (
    <div className="ui-stack risk">
      <PageHeader
        title="Risk & Alerts"
        description="Risk indicators across every work, most severe first, with the factors behind each. Computed from financial and data-quality signals."
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Assessing works" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="No works to assess"
            description="The data provider returned no MPLADS work records."
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load risk data"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && <RiskBody data={state.data} />}
    </div>
  );
}

function RiskBody({ data }: { data: RiskListData }) {
  const [searchParams] = useSearchParams();
  const { filters: globalFilters } = useGlobalFilters();
  const [filters, setFilters] = useState<RiskFilters>(() => filtersFromParams(searchParams));

  const globalRows = useMemo(
    () => applyGlobalFiltersBy(data.rows, (r) => r.project, globalFilters),
    [data.rows, globalFilters],
  );
  const filtered = useMemo(() => filterRows(globalRows, filters), [globalRows, filters]);
  const barOptions = useMemo(
    () => globalFilterOptions(data.rows.map((r) => r.project)),
    [data.rows],
  );

  const categories = useMemo(
    () =>
      [...new Set(data.rows.map((r) => r.project.category).filter((c): c is string => !!c))].sort(),
    [data.rows],
  );

  const set = <K extends keyof RiskFilters>(key: K, value: RiskFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const active = filters.level !== '' || filters.category !== '' || filters.search.trim() !== '';

  const handleExport = (scope: ExportScope) => {
    const csv = toCsv(scopeWorks(filtered, scope), workCsvColumns);
    const parts = ['mpladsentinel', 'risk'];
    if (globalFilters.state) parts.push(filenameSlug(globalFilters.state));
    if (filters.level) parts.push(filters.level.toLowerCase());
    if (scope !== 'all') parts.push(scope);
    downloadCsv(`${parts.join('_')}.csv`, csv);
  };

  const countsByLevel = useMemo(() => {
    const counts: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    for (const row of globalRows) counts[row.risk.level] += 1;
    return counts;
  }, [globalRows]);

  const flaggedForReview = countsByLevel.HIGH + countsByLevel.MEDIUM;

  return (
    <>
      <GlobalFilterBar
        options={barOptions}
        resultLabel={`${filtered.length} of ${data.rows.length} works match`}
      />

      <div className="ui-metric-grid">
        {LEVELS.map((level) => (
          <MetricCard key={level} label={`${level} risk`} value={countsByLevel[level]} />
        ))}
      </div>

      <p className="risk-summary">
        <strong>{flaggedForReview}</strong> of {globalRows.length} assessed works are flagged for
        review (HIGH or MEDIUM risk). The full factor breakdown is on each work; the Overview shows
        which factors are most common.
      </p>

      <div className="risk-filters" role="search" aria-label="More filters for the risk list">
        <div className="risk-filters__grid">
          <Select
            label="Risk level"
            value={filters.level}
            options={[
              { value: '', label: 'All levels' },
              ...LEVELS.map((l) => ({ value: l, label: `${l} risk` })),
            ]}
            onChange={(e) => set('level', e.target.value as RiskFilters['level'])}
          />
          <Select
            label="Category"
            value={filters.category}
            options={[
              { value: '', label: 'All categories' },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
            onChange={(e) => set('category', e.target.value)}
          />
          <SearchInput
            label="Search risk list"
            placeholder="Search description, MP, indicator…"
            value={filters.search}
            onValueChange={(value) => set('search', value)}
          />
        </div>
        <div className="risk-filters__foot">
          <span className="text-muted">
            {filtered.length} {filtered.length === 1 ? 'work' : 'works'}
          </span>
          <div className="risk-filters__foot-actions">
            <ExportMenu onExport={handleExport} count={filtered.length} />
            <button
              type="button"
              className="ui-btn ui-btn--ghost ui-btn--sm"
              disabled={!active}
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <DataTable
        caption="Risk and alerts"
        columns={columns}
        rows={filtered}
        pageSize={25}
        getRowKey={({ project }) => project.sourceWorkId}
        emptyState={
          <EmptyState
            title="No works match the current filters"
            description="Adjust or clear the filters above."
          />
        }
      />
    </>
  );
}
