import { describe, expect, it } from 'vitest';

import type { DuplicatePair, Project } from '../types';
import { capDuplicatePairs, findDuplicatePairs, MAX_DUPLICATE_PAIRS } from './duplicateRules';

let seq = 0;

function project(overrides: Partial<Project> = {}): Project {
  seq += 1;
  return {
    sourceName: 'EMPOWERED_INDIAN',
    sourceWorkId: 900_000_000 + seq,
    workDescription: null,
    category: null,
    house: null,
    lsTerm: null,
    mpName: null,
    constituency: null,
    state: null,
    district: null,
    locationRaw: null,
    estimatedCost: null,
    finalCost: null,
    recommendedOn: null,
    recommendedYear: null,
    completedOn: null,
    completionYear: null,
    sourceStatusRaw: null,
    expectedBeneficiaries: null,
    seenInRecommended: true,
    seenInCompleted: false,
    lifecycleState: 'RECOMMENDED',
    paymentDataState: 'NOT_FETCHED',
    recordedPayments: null,
    paymentInstallments: null,
    dataQualityFlags: [],
    ...overrides,
  };
}

const located = (overrides: Partial<Project> = {}) =>
  project({ state: 'Rajasthan', district: 'Jaipur', category: 'Roads', ...overrides });

describe('findDuplicatePairs', () => {
  it('returns nothing for a group with only one work', () => {
    const a = located({
      workDescription: 'construction of community hall in gram panchayat area for public use',
    });
    expect(findDuplicatePairs([a])).toEqual([]);
  });

  it('returns nothing when the group has two works but no signal fires', () => {
    const a = located({
      workDescription: 'solar panel installation on school rooftop premises',
      estimatedCost: { amount: 1_000_000, currency: 'INR' },
    });
    const b = located({
      workDescription: 'renovation of ancient temple boundary wall structure',
      estimatedCost: { amount: 5_000_000, currency: 'INR' },
    });
    expect(findDuplicatePairs([a, b])).toEqual([]);
  });

  it('flags near-identical descriptions as HIGH confidence', () => {
    const a = located({
      workDescription: 'construction of community hall in gram panchayat area for public use',
    });
    const b = located({
      workDescription: 'construction of community hall in gram panchayat area for general use',
    });

    const pairs = findDuplicatePairs([a, b]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].confidence).toBe('HIGH');
    expect(pairs[0].reasons.join(' ')).toMatch(/similar/i);
  });

  it('flags overlapping costs as MEDIUM confidence when descriptions differ', () => {
    const a = located({
      workDescription: 'solar panel installation on school rooftop premises',
      estimatedCost: { amount: 1_000_000, currency: 'INR' },
    });
    const b = located({
      workDescription: 'renovation of ancient temple boundary wall structure',
      estimatedCost: { amount: 920_000, currency: 'INR' }, // 8% apart
    });

    const pairs = findDuplicatePairs([a, b]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].confidence).toBe('MEDIUM');
    expect(pairs[0].reasons.join(' ')).toMatch(/within 8% of each other/i);
  });

  it('does not compare works in different districts', () => {
    const desc = 'construction of community hall in gram panchayat area for public use';
    const a = located({ workDescription: desc });
    const b = located({ district: 'Jodhpur', workDescription: desc });

    expect(findDuplicatePairs([a, b])).toEqual([]);
  });

  it('skips works missing location or category instead of throwing', () => {
    const desc = 'construction of community hall in gram panchayat area for public use';
    const a = project({ workDescription: desc }); // no state/district/category
    const b = located({ workDescription: desc });

    expect(findDuplicatePairs([a, b])).toEqual([]);
  });

  it('sums weights when both signals fire, staying HIGH confidence', () => {
    const a = located({
      workDescription: 'construction of community hall in gram panchayat area for public use',
      estimatedCost: { amount: 1_000_000, currency: 'INR' },
    });
    const b = located({
      workDescription: 'construction of community hall in gram panchayat area for general use',
      estimatedCost: { amount: 950_000, currency: 'INR' }, // 5% apart
    });

    const pairs = findDuplicatePairs([a, b]);
    expect(pairs[0].score).toBe(90); // 60 (text) + 30 (cost)
    expect(pairs[0].confidence).toBe('HIGH');
    expect(pairs[0].reasons).toHaveLength(2);
  });
});

function pairWithScore(score: number): DuplicatePair {
  return {
    workA: { sourceWorkId: 1, workDescription: null, state: null, district: null, category: null, estimatedCost: null },
    workB: { sourceWorkId: 2, workDescription: null, state: null, district: null, category: null, estimatedCost: null },
    score,
    confidence: 'LOW',
    reasons: ['x'],
  };
}

describe('capDuplicatePairs', () => {
  it('passes every pair through, sorted by score descending, when under the cap', () => {
    const result = capDuplicatePairs([pairWithScore(30), pairWithScore(90), pairWithScore(60)]);
    expect(result.totalFound).toBe(3);
    expect(result.pairs.map((p) => p.score)).toEqual([90, 60, 30]);
  });

  it('caps at MAX_DUPLICATE_PAIRS while keeping the true count', () => {
    const pairs = Array.from({ length: MAX_DUPLICATE_PAIRS + 100 }, (_, i) => pairWithScore(i));
    const result = capDuplicatePairs(pairs);
    expect(result.totalFound).toBe(MAX_DUPLICATE_PAIRS + 100);
    expect(result.pairs).toHaveLength(MAX_DUPLICATE_PAIRS);
    expect(Math.min(...result.pairs.map((p) => p.score))).toBe(100);
  });

  it('returns an empty result for no pairs', () => {
    expect(capDuplicatePairs([])).toEqual({ pairs: [], totalFound: 0 });
  });
});
