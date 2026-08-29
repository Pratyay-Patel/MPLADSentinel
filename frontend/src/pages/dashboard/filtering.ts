import type { Project } from '../../data';

/**
 * Client-side filter state + a pure `applyFilters` for the dashboard's project
 * exploration table. Purely presentational — there is no backend filtering
 * endpoint and none is implied.
 */

export interface DashboardFiltersState {
  state: string;
  district: string;
  house: string;
  category: string;
  /** Year as string ('' = any); matched against recommended OR completion year. */
  year: string;
  search: string;
}

export const EMPTY_FILTERS: DashboardFiltersState = {
  state: '',
  district: '',
  house: '',
  category: '',
  year: '',
  search: '',
};

export function hasActiveFilters(filters: DashboardFiltersState): boolean {
  return (
    filters.state !== '' ||
    filters.district !== '' ||
    filters.house !== '' ||
    filters.category !== '' ||
    filters.year !== '' ||
    filters.search.trim() !== ''
  );
}

export function applyFilters(projects: Project[], filters: DashboardFiltersState): Project[] {
  const search = filters.search.trim().toLowerCase();
  const year = filters.year === '' ? null : Number(filters.year);

  return projects.filter((project) => {
    if (filters.state && project.state !== filters.state) return false;
    if (filters.district && project.district !== filters.district) return false;
    if (filters.house && project.house !== filters.house) return false;
    if (filters.category && project.category !== filters.category) return false;
    if (year != null && project.recommendedYear !== year && project.completionYear !== year) {
      return false;
    }
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
