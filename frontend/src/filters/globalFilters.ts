import type { LifecycleState } from '../data';

/**
 * The app-wide filter set, shared by the Dashboard, Project Register and
 * Risk & Alerts screens and mirrored to the URL query string
 * (`?year=&state=&district=&status=`). Each screen keeps its own extra,
 * screen-specific filters alongside these.
 *
 * All filtering is client-side over the data the provider returns — there is no
 * backend filter endpoint and none is implied.
 */
export interface GlobalFilters {
  /** Recommended OR completion year, as a string. `''` = any. */
  year: string;
  state: string;
  district: string;
  /** Lifecycle state. `''` = any. */
  status: '' | LifecycleState;
}

export const EMPTY_GLOBAL_FILTERS: GlobalFilters = {
  year: '',
  state: '',
  district: '',
  status: '',
};

const LIFECYCLE_VALUES: LifecycleState[] = [
  'RECOMMENDED',
  'COMPLETED',
  'RECOMMENDED_AND_COMPLETED',
];

export function globalFiltersActive(f: GlobalFilters): boolean {
  return f.year !== '' || f.state !== '' || f.district !== '' || f.status !== '';
}

/** The minimal project shape the global filters read. */
export interface GlobalFilterable {
  state: string | null;
  district: string | null;
  lifecycleState: LifecycleState;
  recommendedYear: number | null;
  completionYear: number | null;
}

export function matchesGlobalFilters(project: GlobalFilterable, f: GlobalFilters): boolean {
  if (f.state && project.state !== f.state) return false;
  if (f.district && project.district !== f.district) return false;
  if (f.status && project.lifecycleState !== f.status) return false;
  if (f.year !== '') {
    const y = Number(f.year);
    if (project.recommendedYear !== y && project.completionYear !== y) return false;
  }
  return true;
}

export function applyGlobalFilters<T extends GlobalFilterable>(
  items: T[],
  f: GlobalFilters,
): T[] {
  if (!globalFiltersActive(f)) return items;
  return items.filter((item) => matchesGlobalFilters(item, f));
}

// --- URL query-param round-tripping ---------------------------------

const PARAM_KEYS = ['year', 'state', 'district', 'status'] as const;

export function globalFiltersFromParams(params: URLSearchParams): GlobalFilters {
  const statusRaw = params.get('status') ?? '';
  const status = (LIFECYCLE_VALUES as string[]).includes(statusRaw)
    ? (statusRaw as LifecycleState)
    : '';
  return {
    year: params.get('year') ?? '',
    state: params.get('state') ?? '',
    district: params.get('district') ?? '',
    status,
  };
}

/**
 * Write `filters` into a copy of `params`, dropping empty keys and leaving every
 * other param untouched. Returns the mutated copy.
 */
export function writeGlobalFiltersToParams(
  params: URLSearchParams,
  filters: GlobalFilters,
): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of PARAM_KEYS) {
    const value = filters[key];
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

/** True when the two param sets differ on any of the global-filter keys. */
export function globalParamsDiffer(a: URLSearchParams, b: URLSearchParams): boolean {
  return PARAM_KEYS.some((key) => (a.get(key) ?? '') !== (b.get(key) ?? ''));
}
