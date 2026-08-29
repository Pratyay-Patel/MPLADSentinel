import { useMemo, useState } from 'react';

import {
  useAsyncData,
  useProjectRegisterService,
  type LifecycleState,
  type ProjectRegisterData,
  type RegisterRow,
  type RiskLevel,
} from '../../data';
import { formatINRCompact } from '../../format';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  RiskLevelBadge,
  SearchInput,
  Select,
  StatusBadge,
  ViewProjectLink,
  type Column,
  type SelectOption,
  type StatusTone,
} from '../../ui';

const HOUSE_LABEL: Record<string, string> = {
  LOK_SABHA: 'Lok Sabha',
  RAJYA_SABHA: 'Rajya Sabha',
};

const LIFECYCLE_TONE: Record<LifecycleState, StatusTone> = {
  RECOMMENDED: 'info',
  COMPLETED: 'success',
  RECOMMENDED_AND_COMPLETED: 'normal',
};
const LIFECYCLE_LABEL: Record<LifecycleState, string> = {
  RECOMMENDED: 'Recommended',
  COMPLETED: 'Completed',
  RECOMMENDED_AND_COMPLETED: 'Recommended + completed',
};

interface RegisterFilters {
  state: string;
  district: string;
  house: string;
  category: string;
  lifecycle: '' | LifecycleState;
  risk: '' | RiskLevel;
  search: string;
}

const EMPTY_FILTERS: RegisterFilters = {
  state: '',
  district: '',
  house: '',
  category: '',
  lifecycle: '',
  risk: '',
  search: '',
};

function isActive(filters: RegisterFilters): boolean {
  return (
    filters.state !== '' ||
    filters.district !== '' ||
    filters.house !== '' ||
    filters.category !== '' ||
    filters.lifecycle !== '' ||
    filters.risk !== '' ||
    filters.search.trim() !== ''
  );
}

function filterRows(rows: RegisterRow[], filters: RegisterFilters): RegisterRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter(({ project, risk }) => {
    if (filters.state && project.state !== filters.state) return false;
    if (filters.district && project.district !== filters.district) return false;
    if (filters.house && project.house !== filters.house) return false;
    if (filters.category && project.category !== filters.category) return false;
    if (filters.lifecycle && project.lifecycleState !== filters.lifecycle) return false;
    if (filters.risk && risk.level !== filters.risk) return false;
    if (search) {
      const haystack = [
        project.workDescription,
        project.mpName,
        project.constituency,
        project.state,
        project.district,
        project.category,
        String(project.sourceWorkId),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function opts(values: string[], anyLabel: string): SelectOption[] {
  return [{ value: '', label: anyLabel }, ...values.map((value) => ({ value, label: value }))];
}

const columns: Column<RegisterRow>[] = [
  {
    key: 'project',
    header: 'Work',
    render: ({ project }) => (
      <div className="dash-cell-primary">
        <span className="dash-cell-primary__title">
          {project.workDescription ?? `Work ${project.sourceWorkId}`}
        </span>
        <span className="dash-cell-primary__sub">
          {[project.state, project.district].filter(Boolean).join(' · ')} · #{project.sourceWorkId}
        </span>
      </div>
    ),
  },
  { key: 'category', header: 'Category', render: ({ project }) => project.category ?? '—' },
  {
    key: 'mp',
    header: 'Member of Parliament',
    render: ({ project }) => (
      <div className="reg-cell">
        <span>{project.mpName ?? '—'}</span>
        <span className="reg-cell__sub">
          {[
            project.house ? (HOUSE_LABEL[project.house] ?? project.house) : null,
            project.constituency,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
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
      <span className="reg-risk">
        <RiskLevelBadge level={risk.level} />
        {risk.score != null ? <span className="reg-risk__score">score {risk.score}</span> : null}
      </span>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    align: 'right',
    render: ({ project }) => (
      <ViewProjectLink id={project.sourceWorkId} label={project.workDescription ?? undefined} />
    ),
  },
];

/**
 * Project Register (`/projects`) — the full searchable/filterable list of MPLADS
 * works. Distinct from the dashboard's compact exploration table: every work,
 * more columns, more filters, its own route. Filtering is client-side over the
 * data the provider returns; no backend filter endpoint is implied. Data comes
 * via `useProjectRegisterService()` → DataProvider.
 */
export function ProjectRegister() {
  const service = useProjectRegisterService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<ProjectRegisterData>(
    (signal) => service.load(signal),
    [service, reloadKey],
    { isEmpty: (data) => data.rows.length === 0 },
  );

  return (
    <div className="ui-stack reg">
      <PageHeader
        title="Project Register"
        description="Every MPLADS work in the dataset, with status and risk indicators. Search and filter to narrow the list, then open a work for the full record."
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading works" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="No works available"
            description="The data provider returned no MPLADS work records."
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load the register"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && <RegisterBody data={state.data} />}
    </div>
  );
}

function RegisterBody({ data }: { data: ProjectRegisterData }) {
  const [filters, setFilters] = useState<RegisterFilters>(EMPTY_FILTERS);
  const filtered = useMemo(() => filterRows(data.rows, filters), [data.rows, filters]);

  const set = <K extends keyof RegisterFilters>(key: K, value: RegisterFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const { filterOptions } = data;

  return (
    <>
      <div className="reg-filters" role="search" aria-label="Filter the register">
        <div className="reg-filters__grid">
          <Select
            label="State"
            value={filters.state}
            options={opts(filterOptions.states, 'All states')}
            onChange={(e) => set('state', e.target.value)}
          />
          <Select
            label="District"
            value={filters.district}
            options={opts(filterOptions.districts, 'All districts')}
            onChange={(e) => set('district', e.target.value)}
          />
          <Select
            label="House"
            value={filters.house}
            options={[
              { value: '', label: 'Both Houses' },
              ...filterOptions.houses.map((h) => ({ value: h, label: HOUSE_LABEL[h] ?? h })),
            ]}
            onChange={(e) => set('house', e.target.value)}
          />
          <Select
            label="Category"
            value={filters.category}
            options={opts(filterOptions.categories, 'All categories')}
            onChange={(e) => set('category', e.target.value)}
          />
          <Select
            label="Status"
            value={filters.lifecycle}
            options={[
              { value: '', label: 'Any status' },
              ...filterOptions.lifecycleStates.map((s) => ({
                value: s,
                label: LIFECYCLE_LABEL[s],
              })),
            ]}
            onChange={(e) => set('lifecycle', e.target.value as RegisterFilters['lifecycle'])}
          />
          <Select
            label="Risk level"
            value={filters.risk}
            options={[
              { value: '', label: 'Any risk level' },
              ...filterOptions.riskLevels.map((r) => ({ value: r, label: `${r} risk` })),
            ]}
            onChange={(e) => set('risk', e.target.value as RegisterFilters['risk'])}
          />
          <SearchInput
            label="Search the register"
            placeholder="Search description, MP, location…"
            value={filters.search}
            onValueChange={(value) => set('search', value)}
          />
        </div>
        <div className="reg-filters__foot">
          <span className="text-muted">
            {filtered.length} of {data.rows.length} {data.rows.length === 1 ? 'work' : 'works'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={!isActive(filters)}
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear filters
          </Button>
        </div>
      </div>

      <DataTable
        caption="Project register"
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
