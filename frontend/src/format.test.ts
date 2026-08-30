import { describe, expect, it } from 'vitest';

import {
  formatCount,
  formatDate,
  formatINRCompact,
  formatINRExact,
  formatPercent,
  hasReadableDescription,
  tidyDescription,
  workTitle,
} from './format';

describe('formatters', () => {
  it('formatINRCompact uses lakh / crore and trims a trailing .0', () => {
    expect(formatINRCompact({ amount: 1_080_000, currency: 'INR' })).toBe('₹10.8 L');
    expect(formatINRCompact({ amount: 2_500_000, currency: 'INR' })).toBe('₹25 L');
    expect(formatINRCompact({ amount: 12_300_000, currency: 'INR' })).toBe('₹1.2 Cr');
    expect(formatINRCompact({ amount: 5_000, currency: 'INR' })).toBe('₹5,000');
    expect(formatINRCompact(null)).toBe('—');
  });

  it('formatINRExact groups digits Indian-style', () => {
    expect(formatINRExact({ amount: 1_080_000, currency: 'INR' })).toBe('₹10,80,000');
    expect(formatINRExact(undefined)).toBe('—');
  });

  it('formatCount and formatPercent', () => {
    expect(formatCount(1234)).toBe('1,234');
    expect(formatPercent(0.4)).toBe('40%');
  });

  it('formatDate renders a readable date and handles null', () => {
    const rendered = formatDate('2024-08-15');
    expect(rendered).toContain('2024');
    expect(rendered).toContain('Aug');
    expect(rendered).toContain('15');
    expect(formatDate(null)).toBe('—');
  });
});

describe('work description helpers', () => {
  it('tidyDescription strips leading/trailing separator noise, not question marks', () => {
    expect(tidyDescription(', Construction of road at X')).toBe('Construction of road at X');
    expect(tidyDescription('  - Bridge work -  ')).toBe('Bridge work');
    expect(tidyDescription(' , , , ')).toBeNull();
    expect(tidyDescription('?? ??')).toBe('?? ??'); // kept verbatim
    expect(tidyDescription(null)).toBeNull();
  });

  it('hasReadableDescription requires at least 3 letters after tidying', () => {
    expect(hasReadableDescription('Community hall')).toBe(true);
    expect(hasReadableDescription(', Gym block')).toBe(true);
    expect(hasReadableDescription('?? ?? ??')).toBe(false);
    expect(hasReadableDescription('- 2 ?? ?? ??')).toBe(false);
    expect(hasReadableDescription('TV')).toBe(false);
    expect(hasReadableDescription(null)).toBe(false);
  });

  it('workTitle falls back to "Work #<id>" for an unusable description', () => {
    expect(workTitle('Boundary wall for school', 157315)).toBe('Boundary wall for school');
    expect(workTitle(', Paver block road', 146709)).toBe('Paver block road');
    expect(workTitle('?? ?? ??', 3493)).toBe('Work #3493');
    expect(workTitle(null, 3552)).toBe('Work #3552');
  });
});
