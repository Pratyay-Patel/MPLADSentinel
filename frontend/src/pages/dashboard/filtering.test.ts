import { describe, expect, it } from 'vitest';

import { demoProjects } from '../../data/demo/fixtures';
import { applyFilters, EMPTY_FILTERS, hasActiveFilters } from './filtering';

const all = [...demoProjects];

describe('dashboard exploration-table filtering', () => {
  it('returns every project when no filter is active', () => {
    expect(applyFilters(all, EMPTY_FILTERS)).toHaveLength(all.length);
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
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
    expect(hasActiveFilters({ ...EMPTY_FILTERS, house: 'RAJYA_SABHA' })).toBe(true);
  });

  it('search matches description, MP and location text case-insensitively', () => {
    const bySearch = applyFilters(all, { ...EMPTY_FILTERS, search: 'community hall' });
    expect(bySearch.some((p) => /community hall/i.test(p.workDescription ?? ''))).toBe(true);

    const byMp = applyFilters(all, { ...EMPTY_FILTERS, search: 'sharma' });
    expect(byMp.length).toBeGreaterThan(0);
    expect(byMp.every((p) => /sharma/i.test(p.mpName ?? ''))).toBe(true);
  });

  it('returns an empty list when filters exclude everything', () => {
    const rows = applyFilters(all, { ...EMPTY_FILTERS, category: 'Repair and Renovation', search: 'zzzznope' });
    expect(rows).toHaveLength(0);
  });
});
