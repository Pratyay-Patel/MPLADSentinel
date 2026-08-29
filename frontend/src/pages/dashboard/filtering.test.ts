import { describe, expect, it } from 'vitest';

import { demoProjects } from '../../data/demo/fixtures';
import { applyFilters, EMPTY_FILTERS, hasActiveFilters } from './filtering';

const all = [...demoProjects];

describe('dashboard filtering', () => {
  it('returns every project when no filter is active', () => {
    expect(applyFilters(all, EMPTY_FILTERS)).toHaveLength(all.length);
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('narrows by state', () => {
    const kerala = applyFilters(all, { ...EMPTY_FILTERS, state: 'Kerala' });
    expect(kerala.length).toBeGreaterThan(0);
    expect(kerala.every((p) => p.state === 'Kerala')).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, state: 'Kerala' })).toBe(true);
  });

  it('narrows by house and category together', () => {
    const rows = applyFilters(all, {
      ...EMPTY_FILTERS,
      house: 'RAJYA_SABHA',
      category: 'Repair and Renovation',
    });
    expect(
      rows.every((p) => p.house === 'RAJYA_SABHA' && p.category === 'Repair and Renovation'),
    ).toBe(true);
  });

  it('matches a year against recommended OR completion year', () => {
    const y2026 = applyFilters(all, { ...EMPTY_FILTERS, year: '2026' });
    expect(y2026.length).toBeGreaterThan(0);
    expect(y2026.every((p) => p.recommendedYear === 2026 || p.completionYear === 2026)).toBe(true);
  });

  it('search matches description, MP and location text case-insensitively', () => {
    const bySearch = applyFilters(all, { ...EMPTY_FILTERS, search: 'community hall' });
    expect(bySearch.some((p) => /community hall/i.test(p.workDescription ?? ''))).toBe(true);

    const byMp = applyFilters(all, { ...EMPTY_FILTERS, search: 'sharma' });
    expect(byMp.length).toBeGreaterThan(0);
    expect(byMp.every((p) => /sharma/i.test(p.mpName ?? ''))).toBe(true);
  });

  it('returns an empty list when filters exclude everything', () => {
    const rows = applyFilters(all, { ...EMPTY_FILTERS, state: 'Kerala', district: 'Jaipur' });
    expect(rows).toHaveLength(0);
  });
});
