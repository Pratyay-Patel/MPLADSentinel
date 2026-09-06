import { Button, Select, type SelectOption } from '../ui';
import { useGlobalFilters } from './context';
import { globalFiltersActive, type GlobalFilters } from './globalFilters';

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Any status' },
  { value: 'RECOMMENDED', label: 'Recommended' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'RECOMMENDED_AND_COMPLETED', label: 'Recommended + completed' },
];

export interface GlobalFilterBarProps {
  /** Distinct values from the current screen's dataset. */
  options: { states: string[]; districts: string[]; years: number[] };
  /** Works matched after the global filters, for the summary line. */
  resultLabel?: string;
}

function toOptions(values: string[], anyLabel: string): SelectOption[] {
  return [{ value: '', label: anyLabel }, ...values.map((v) => ({ value: v, label: v }))];
}

/**
 * The app-wide filter bar (year / state / district / status), shown at the top
 * of the Dashboard, Project Register and Risk & Alerts. State lives in
 * {@link useGlobalFilters} and is mirrored to the URL; each screen applies these
 * filters to its data and keeps its own extra filters below.
 */
export function GlobalFilterBar({ options, resultLabel }: GlobalFilterBarProps) {
  const { filters, setFilters, clear } = useGlobalFilters();

  const set = <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) =>
    setFilters({ ...filters, [key]: value });

  const active = globalFiltersActive(filters);

  return (
    <div className="global-filters" role="search" aria-label="Filter all views">
      <div className="global-filters__grid">
        <Select
          label="Year"
          value={filters.year}
          options={[
            { value: '', label: 'Any year' },
            ...options.years.map((y) => ({ value: String(y), label: String(y) })),
          ]}
          onChange={(e) => set('year', e.target.value)}
        />
        <Select
          label="State"
          value={filters.state}
          options={toOptions(options.states, 'All states')}
          onChange={(e) => set('state', e.target.value)}
        />
        <Select
          label="District"
          value={filters.district}
          options={toOptions(options.districts, 'All districts')}
          onChange={(e) => set('district', e.target.value)}
        />
        <Select
          label="Status"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(e) => set('status', e.target.value as GlobalFilters['status'])}
        />
      </div>
      <div className="global-filters__foot">
        <span className="text-muted">
          {active ? resultLabel ?? 'Filters applied' : 'Showing all works'}
        </span>
        <Button size="sm" variant="ghost" disabled={!active} onClick={clear}>
          Clear filters
        </Button>
      </div>
    </div>
  );
}
