import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  useAsyncData,
  useCitizenService,
  type CitizenListData,
  type LifecycleState,
  type PublicProject,
} from '../../data';
import { formatINRCompact, workTitle } from '../../format';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  type Column,
  type SelectOption,
  type StatusTone,
} from '../../ui';

const HOUSE_LABEL: Record<string, string> = {
  LOK_SABHA: 'Lok Sabha',
  RAJYA_SABHA: 'Rajya Sabha',
};

const STATUS_TONE: Record<LifecycleState, StatusTone> = {
  RECOMMENDED: 'info',
  COMPLETED: 'success',
  RECOMMENDED_AND_COMPLETED: 'normal',
};
const STATUS_LABEL: Record<LifecycleState, string> = {
  RECOMMENDED: 'Recommended',
  COMPLETED: 'Completed',
  RECOMMENDED_AND_COMPLETED: 'Recommended + completed',
};

interface PortalFilters {
  state: string;
  category: string;
  search: string;
}

const EMPTY_FILTERS: PortalFilters = { state: '', category: '', search: '' };

function opts(values: string[], anyLabel: string): SelectOption[] {
  return [{ value: '', label: anyLabel }, ...values.map((value) => ({ value, label: value }))];
}

function filterProjects(projects: PublicProject[], filters: PortalFilters): PublicProject[] {
  const search = filters.search.trim().toLowerCase();
  return projects.filter((project) => {
    if (filters.state && project.state !== filters.state) return false;
    if (filters.category && project.category !== filters.category) return false;
    if (search) {
      const haystack = [
        project.workDescription,
        project.memberOfParliament,
        project.constituency,
        project.state,
        project.district,
        project.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

const columns: Column<PublicProject>[] = [
  {
    key: 'work',
    header: 'Work',
    render: (project) => (
      <div className="dash-cell-primary">
        <span className="dash-cell-primary__title">
          {workTitle(project.workDescription, project.reference)}
        </span>
        <span className="dash-cell-primary__sub">
          {[project.state, project.district].filter(Boolean).join(' · ') || '—'}
        </span>
      </div>
    ),
  },
  { key: 'category', header: 'Category', render: (p) => p.category ?? '—' },
  {
    key: 'mp',
    header: 'Represented by',
    render: (project) => (
      <div className="cit-cell">
        <span>{project.memberOfParliament ?? '—'}</span>
        <span className="cit-cell__sub">
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
    header: 'Estimated cost',
    align: 'right',
    render: (p) => formatINRCompact(p.estimatedCost),
  },
  {
    key: 'status',
    header: 'Status',
    render: (project) => (
      <StatusBadge tone={STATUS_TONE[project.status]} srLabel="Status">
        {STATUS_LABEL[project.status]}
      </StatusBadge>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    align: 'right',
    render: (project) => (
      <Link
        className="ui-btn ui-btn--ghost ui-btn--sm"
        to={`/citizen/${project.reference}`}
        aria-label={`View ${workTitle(project.workDescription, project.reference)}`}
      >
        View <span aria-hidden>→</span>
      </Link>
    ),
  },
];

/**
 * Citizen Portal (`/citizen`) — a read-only, public browse of MPLADS works.
 *
 * Every work is served as a {@link PublicProject} (see `data/features/citizen.ts`),
 * which carries only publicly releasable fields — no risk scores, no
 * data-quality flags, no payment-retrieval internals. Data comes via
 * `useCitizenService()` → DataProvider.
 */
export function CitizenPortal() {
  const service = useCitizenService();
  const [reloadKey, setReloadKey] = useState(0);

  const state = useAsyncData<CitizenListData>(
    (signal) => service.list(signal),
    [service, reloadKey],
    {
      isEmpty: (data) => data.projects.length === 0,
    },
  );

  return (
    <div className="ui-stack cit">
      <PageHeader
        title="Citizen Portal"
        description="Public information on MPLADS works — what was sanctioned, where, by which representative, and its current status."
      />

      {state.status === 'loading' && (
        <Card>
          <LoadingState label="Loading works" />
        </Card>
      )}

      {state.status === 'empty' && (
        <Card>
          <EmptyState
            title="No works to show"
            description="No MPLADS work records are available."
          />
        </Card>
      )}

      {state.status === 'error' && (
        <Card>
          <ErrorState
            title="Could not load works"
            description={state.error.message}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </Card>
      )}

      {state.status === 'success' && <PortalBody data={state.data} />}
    </div>
  );
}

function PortalBody({ data }: { data: CitizenListData }) {
  const [filters, setFilters] = useState<PortalFilters>(EMPTY_FILTERS);
  const filtered = useMemo(() => filterProjects(data.projects, filters), [data.projects, filters]);

  const set = <K extends keyof PortalFilters>(key: K, value: PortalFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const active = filters.state !== '' || filters.category !== '' || filters.search.trim() !== '';

  return (
    <>
      <div className="cit-filters" role="search" aria-label="Find a work">
        <div className="cit-filters__grid">
          <Select
            label="State"
            value={filters.state}
            options={opts(data.filterOptions.states, 'All states')}
            onChange={(e) => set('state', e.target.value)}
          />
          <Select
            label="Category"
            value={filters.category}
            options={opts(data.filterOptions.categories, 'All categories')}
            onChange={(e) => set('category', e.target.value)}
          />
          <SearchInput
            label="Search works"
            placeholder="Search description, representative, place…"
            value={filters.search}
            onValueChange={(value) => set('search', value)}
          />
        </div>
        <div className="cit-filters__foot">
          <span className="text-muted">
            {filtered.length} of {data.projects.length}{' '}
            {data.projects.length === 1 ? 'work' : 'works'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={!active}
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear
          </Button>
        </div>
      </div>

      <DataTable
        caption="Public list of MPLADS works"
        columns={columns}
        rows={filtered}
        pageSize={25}
        getRowKey={(project) => project.reference}
        emptyState={
          <EmptyState
            title="No works match your search"
            description="Try a different place, category or search term."
          />
        }
      />
    </>
  );
}
