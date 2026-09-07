import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  classifyRiskReason,
  riskFactorFromSlug,
  useAsyncData,
  useRiskService,
  type RiskFactorCategory,
  type RiskListData,
  type RiskLevel,
  type RiskRow,
} from '../../data';
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
  /** When no specific `level` is picked, the list is the triage queue (HIGH + MEDIUM only)
   *  unless this is set, which widens it to every assessed level. */
  showAllLevels: boolean;
  /** Set from `?factor=` (Overview anomaly cards) — keep only works whose model
   *  reasons classify to this factor. Spans all levels while active. */
  factor: '' | RiskFactorCategory;
}

const EMPTY_FILTERS: RiskFilters = {
  level: '',
  category: '',
  search: '',
  showAllLevels: false,
  factor: '',
};

const REVIEW_LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM'];

/** Seed filters from the URL: `?level=` (voice command bar) is an explicit level
 *  choice that overrides the HIGH+MEDIUM default; `?factor=` (Overview anomaly
 *  cards) scopes the list to one risk factor. `?state=` is the global bar. */
function filtersFromParams(params: URLSearchParams): RiskFilters {
  const level = params.get('level')?.toUpperCase() ?? '';
  const factorSlug = params.get('factor') ?? '';
  return {
    ...EMPTY_FILTERS,
    level: (LEVELS as string[]).includes(level) ? (level as RiskLevel) : '',
    factor: riskFactorFromSlug(factorSlug) ?? '',
  };
}

function filterRows(rows: RiskRow[], filters: RiskFilters): RiskRow[] {
  const search = filters.search.trim().toLowerCase();
  const flaggedOnly = !filters.level && !filters.showAllLevels && !filters.factor;
  return rows.filter(({ project, risk }) => {
    if (filters.level && risk.level !== filters.level) return false;
    if (flaggedOnly && !REVIEW_LEVELS.includes(risk.level)) return false;
    if (filters.factor && !risk.reasons.some((r) => classifyRiskReason(r) === filters.factor)) {
      return false;
    }
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
 * Risk & Alerts (`/risk`) — the triage queue. By default it lists only the works
 * flagged HIGH or MEDIUM risk, most severe first, with the factors behind each
 * score; a toggle widens it to every assessed level, and a specific `?level=`
 * deep-link (or the level select) overrides the default. Scores come from the
 * weighted statistical risk model over financial and data-quality signals
 * (`src/data/risk/rules.ts` in demo; the Round-1 engine runs server-side). Data
 * comes via `useRiskService()` → DataProvider.
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
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Risk & Alerts' }]}
        title="Risk & Alerts"
        description="Flagged works — HIGH or MEDIUM risk, most severe first — with the factors behind each score. Scored by a weighted statistical risk model over financial and data-quality signals; indicators for review, not proof of wrongdoing."
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

  const active =
    filters.level !== '' ||
    filters.category !== '' ||
    filters.search.trim() !== '' ||
    filters.showAllLevels ||
    filters.factor !== '';

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

      <div className="risk-summary">
        <div className="risk-summary__count">
          <span className="risk-summary__count-value">
            {flaggedForReview.toLocaleString('en-IN')}
          </span>
          <span className="risk-summary__count-label">flagged for review</span>
        </div>
        <div className="risk-summary__text">
          <p className="risk-summary__lead">
            Works flagged for review — <strong>HIGH or MEDIUM risk</strong>, most severe first —
            shown by default, out of {globalRows.length.toLocaleString('en-IN')} assessed.
          </p>
          <p className="risk-summary__hint">
            Turn on <span className="risk-summary__hint-em">Show all risk levels</span> to include
            LOW and UNKNOWN. Every work carries its full factor breakdown.
          </p>
        </div>
      </div>

      {filters.factor && (
        <div className="risk-factor-chip">
          <span>
            Scoped to risk factor: <strong>{filters.factor}</strong>
          </span>
          <button
            type="button"
            className="risk-factor-chip__clear"
            onClick={() => set('factor', '')}
          >
            Clear <span aria-hidden>✕</span>
          </button>
        </div>
      )}

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
          <div className="risk-filters__foot-status">
            <span className="text-muted">
              {filtered.length} {filtered.length === 1 ? 'work' : 'works'}
            </span>
            {!filters.level && (
              <label className="risk-toggle">
                <input
                  type="checkbox"
                  checked={filters.showAllLevels}
                  onChange={(e) => set('showAllLevels', e.target.checked)}
                />
                <span className="risk-toggle__track" aria-hidden="true">
                  <span className="risk-toggle__thumb" />
                </span>
                <span className="risk-toggle__text">
                  Show all risk levels <span className="risk-toggle__sub">(incl. LOW &amp; UNKNOWN)</span>
                </span>
              </label>
            )}
          </div>
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
