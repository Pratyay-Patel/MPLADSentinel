import { describe, expect, it } from 'vitest';

import { demoProjects } from '../data/demo/fixtures';
import {
  EMPTY_GLOBAL_FILTERS,
  applyGlobalFilters,
  globalFiltersActive,
  globalFiltersFromParams,
  writeGlobalFiltersToParams,
} from './globalFilters';

const all = [...demoProjects];

describe('applyGlobalFilters', () => {
  it('returns every work when nothing is set', () => {
    expect(applyGlobalFilters(all, EMPTY_GLOBAL_FILTERS)).toHaveLength(all.length);
    expect(globalFiltersActive(EMPTY_GLOBAL_FILTERS)).toBe(false);
  });

  it('narrows by state', () => {
    const kerala = applyGlobalFilters(all, { ...EMPTY_GLOBAL_FILTERS, state: 'Kerala' });
    expect(kerala.length).toBeGreaterThan(0);
    expect(kerala.every((p) => p.state === 'Kerala')).toBe(true);
    expect(globalFiltersActive({ ...EMPTY_GLOBAL_FILTERS, state: 'Kerala' })).toBe(true);
  });

  it('matches a year against recommended OR completion year', () => {
    const y2026 = applyGlobalFilters(all, { ...EMPTY_GLOBAL_FILTERS, year: '2026' });
    expect(y2026.length).toBeGreaterThan(0);
    expect(y2026.every((p) => p.recommendedYear === 2026 || p.completionYear === 2026)).toBe(true);
  });

  it('narrows by status (lifecycle state)', () => {
    const completed = applyGlobalFilters(all, { ...EMPTY_GLOBAL_FILTERS, status: 'COMPLETED' });
    expect(completed.every((p) => p.lifecycleState === 'COMPLETED')).toBe(true);
  });

  it('combines state + district (AND)', () => {
    const rows = applyGlobalFilters(all, {
      ...EMPTY_GLOBAL_FILTERS,
      state: 'Kerala',
      district: 'Jaipur',
    });
    expect(rows).toHaveLength(0);
  });
});

describe('URL round-tripping', () => {
  it('reads the four keys and ignores an unknown status', () => {
    const params = new URLSearchParams('year=2025&state=Bihar&district=Patna&status=BOGUS&level=HIGH');
    expect(globalFiltersFromParams(params)).toEqual({
      year: '2025',
      state: 'Bihar',
      district: 'Patna',
      status: '',
    });
  });

  it('writes set keys, drops empty ones, keeps other params', () => {
    const params = new URLSearchParams('level=HIGH');
    const next = writeGlobalFiltersToParams(params, {
      year: '',
      state: 'Bihar',
      district: '',
      status: 'COMPLETED',
    });
    expect(next.get('state')).toBe('Bihar');
    expect(next.get('status')).toBe('COMPLETED');
    expect(next.has('year')).toBe(false);
    expect(next.get('level')).toBe('HIGH');
  });
});
