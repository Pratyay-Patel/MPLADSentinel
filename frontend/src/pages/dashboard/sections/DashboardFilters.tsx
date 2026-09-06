import type { DashboardFilterOptions } from '../../../data';
import { Button, SearchInput, Select, type SelectOption } from '../../../ui';
import { EMPTY_FILTERS, hasActiveFilters, type DashboardFiltersState } from '../filtering';

const HOUSE_LABEL: Record<string, string> = {
  LOK_SABHA: 'Lok Sabha',
  RAJYA_SABHA: 'Rajya Sabha',
};

function toOptions(values: string[], anyLabel: string): SelectOption[] {
  return [{ value: '', label: anyLabel }, ...values.map((value) => ({ value, label: value }))];
}

export interface DashboardFiltersProps {
  filters: DashboardFiltersState;
  options: DashboardFilterOptions;
  onChange: (next: DashboardFiltersState) => void;
  /** Rows matched by the current filters, for the result count. */
  resultCount: number;
}

/**
 * Section 5 — frontend demo filters for the project-exploration table. No
 * backend filtering endpoint is implied; all filtering is client-side over the
 * demo dataset.
 */
export function DashboardFilters({
  filters,
  options,
  onChange,
  resultCount,
}: DashboardFiltersProps) {
  const set = <K extends keyof DashboardFiltersState>(key: K, value: DashboardFiltersState[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="dash-filters" role="search" aria-label="Filter the exploration table">
      <div className="dash-filters__grid">
        <Select
          label="House"
          value={filters.house}
          options={[
            { value: '', label: 'Both Houses' },
            ...options.houses.map((h) => ({ value: h, label: HOUSE_LABEL[h] ?? h })),
          ]}
          onChange={(e) => set('house', e.target.value)}
        />
        <Select
          label="Category"
          value={filters.category}
          options={toOptions(options.categories, 'All categories')}
          onChange={(e) => set('category', e.target.value)}
        />
        <SearchInput
          label="Search projects"
          placeholder="Search description, MP, location…"
          value={filters.search}
          onValueChange={(value) => set('search', value)}
        />
      </div>
      <div className="dash-filters__foot">
        <span className="text-muted">
          {resultCount} {resultCount === 1 ? 'project' : 'projects'} match
        </span>
        <Button
          size="sm"
          variant="ghost"
          disabled={!hasActiveFilters(filters)}
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}
