import { describe, expect, it } from 'vitest';

import type { ProjectRisk } from '../types';
import { recommendedAction, riskDimensions, RISK_DIMENSIONS } from './riskInsights';

const risk = (level: ProjectRisk['level'], reasons: string[]): ProjectRisk => ({
  sourceWorkId: 1,
  level,
  score: reasons.length ? 60 : null,
  reasons,
  assessedAt: null,
});

describe('riskDimensions', () => {
  it('returns all six dimensions, flagging the ones this work hits', () => {
    const dims = riskDimensions(
      risk('HIGH', [
        'Recorded payments exceed the estimated cost by 15%',
        'Full amount released in a single installment',
      ]),
    );

    expect(dims).toHaveLength(RISK_DIMENSIONS.length);
    const flagged = dims.filter((d) => d.flagged).map((d) => d.label);
    expect(flagged).toEqual(['Cost overspend', 'Single-installment payout']);

    const overspend = dims.find((d) => d.label === 'Cost overspend')!;
    expect(overspend.note).toBe('Recorded payments exceed the estimated cost by 15%');
    expect(dims.find((d) => d.label === 'Dormant, no payments')!.note).toBeNull();
  });

  it('flags nothing when there are no reasons', () => {
    const dims = riskDimensions(risk('LOW', []));
    expect(dims.every((d) => !d.flagged)).toBe(true);
  });
});

describe('recommendedAction', () => {
  it('is keyed to the first (highest-listed) reason', () => {
    const action = recommendedAction(
      risk('HIGH', [
        'Recommended 30 months ago with no payment records (long-dormant)',
        'Recorded payments exceed the estimated cost by 5%',
      ]),
    );
    expect(action?.category).toBe('Dormant, no payments');
    expect(action?.trigger).toBe(
      'Recommended 30 months ago with no payment records (long-dormant)',
    );
    expect(action?.action).toMatch(/started/i);
  });

  it('is null for UNKNOWN or when there are no indicators', () => {
    expect(recommendedAction(risk('UNKNOWN', []))).toBeNull();
    expect(recommendedAction(risk('LOW', []))).toBeNull();
  });
});
