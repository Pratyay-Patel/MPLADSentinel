import { describe, expect, it } from 'vitest';

import type { ProjectRisk } from '../types';
import {
  featureContributions,
  recommendedAction,
  riskDimensions,
  RISK_DIMENSIONS,
} from './riskInsights';

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

describe('featureContributions', () => {
  it('ranks each flagged factor by its model weight, largest first', () => {
    const factors = featureContributions(
      risk('HIGH', [
        'Full amount released in a single installment', // Single-installment payout = 25
        'Recorded payments exceed the estimated cost by 12%', // Cost overspend = 45
      ]),
    );

    expect(factors.map((f) => f.category)).toEqual(['Cost overspend', 'Single-installment payout']);
    expect(factors.map((f) => f.points)).toEqual([45, 25]);
    // shares sum to 100 and are proportional to the points
    expect(Math.round(factors[0].sharePct + factors[1].sharePct)).toBe(100);
    expect(factors[0].sharePct).toBeGreaterThan(factors[1].sharePct);
  });

  it('grades the dormant factor 30 / 45 / 55 by how long the work has been dormant', () => {
    const w = (reason: string) => featureContributions(risk('HIGH', [reason]))[0].points;
    expect(w('Recommended 14 months ago with no payment records')).toBe(30);
    expect(w('Recommended 26 months ago with no payment records')).toBe(45);
    expect(w('Recommended 40 months ago with no payment records (long-dormant)')).toBe(55);
  });

  it('is empty for UNKNOWN or no-indicator works', () => {
    expect(featureContributions(risk('UNKNOWN', []))).toEqual([]);
    expect(featureContributions(risk('LOW', []))).toEqual([]);
  });
});
