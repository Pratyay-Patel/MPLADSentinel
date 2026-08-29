import { describe, expect, it } from 'vitest';

import { formatCount, formatDate, formatINRCompact, formatINRExact, formatPercent } from './format';

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
