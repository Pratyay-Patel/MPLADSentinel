import { describe, expect, it } from 'vitest';

import type { ProjectRisk } from '../types';
import { classifyRiskReason, summarizeRiskFactors } from './riskFactors';

describe('classifyRiskReason', () => {
  it('maps each rule-engine reason phrasing to its category', () => {
    expect(classifyRiskReason('Recorded payments exceed the estimated cost by 23%')).toBe(
      'Cost overspend',
    );
    expect(
      classifyRiskReason('88% of the estimated cost released while the work is not marked complete'),
    ).toBe('Payout before completion');
    expect(classifyRiskReason('Full amount released in a single installment')).toBe(
      'Single-installment payout',
    );
    expect(classifyRiskReason('Recommended 41 months ago with no payment records (long-dormant)')).toBe(
      'Dormant, no payments',
    );
    expect(
      classifyRiskReason('Estimated cost is the highest for the Health category among comparable works'),
    ).toBe('Cost outlier vs peers');
    expect(classifyRiskReason('Payment data could not be retrieved for review')).toBe(
      'Payment data unavailable',
    );
  });

  it('falls back to "Other signal" for anything unrecognised', () => {
    expect(classifyRiskReason('Some future rule we have not seen')).toBe('Other signal');
  });
});

describe('summarizeRiskFactors', () => {
  const risk = (reasons: string[]): ProjectRisk => ({
    sourceWorkId: 1,
    level: 'HIGH',
    score: 70,
    reasons,
    assessedAt: null,
  });

  it('counts across all risks, drops zero categories, sorts by count desc', () => {
    const factors = summarizeRiskFactors([
      risk(['Recorded payments exceed the estimated cost by 10%', 'Full amount released in a single installment']),
      risk(['Recorded payments exceed the estimated cost by 40%']),
      risk(['Recommended 20 months ago with no payment records']),
    ]);

    expect(factors).toEqual([
      { label: 'Cost overspend', count: 2 },
      { label: 'Single-installment payout', count: 1 },
      { label: 'Dormant, no payments', count: 1 },
    ]);
  });

  it('returns an empty list when no reasons are present', () => {
    expect(summarizeRiskFactors([risk([]), risk([])])).toEqual([]);
  });
});
