import type { Project } from '../../data';

/**
 * Client-side filter state + a pure `applyFilters` for the dashboard's project
 * exploration table. These are the table's *own* extra filters — state,
 * district, year and status are handled by the app-wide {@link GlobalFilterBar}.
 * Purely presentational; there is no backend filtering endpoint.
 */

export interface DashboardFiltersState {
  house: string;
  category: string;
  search: string;
}

export const EMPTY_FILTERS: DashboardFiltersState = {
  house: '',
  category: '',
  search: '',
};

export function hasActiveFilters(filters: DashboardFiltersState): boolean {
  return filters.house !== '' || filters.category !== '' || filters.search.trim() !== '';
}

export function applyFilters(projects: Project[], filters: DashboardFiltersState): Project[] {
  const search = filters.search.trim().toLowerCase();

  return projects.filter((project) => {
    if (filters.house && project.house !== filters.house) return false;
    if (filters.category && project.category !== filters.category) return false;
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
