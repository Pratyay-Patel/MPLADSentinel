import { describe, expect, it } from 'vitest';

import type { Project, ProjectRisk } from '../types';
import { aggregateMps } from './mpComparison';

function project(p: Partial<Project>): Project {
  return {
    sourceName: 'x',
    sourceWorkId: 0,
    workDescription: null,
    category: null,
    house: 'LOK_SABHA',
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
    seenInRecommended: false,
    seenInCompleted: false,
    lifecycleState: 'RECOMMENDED',
    paymentDataState: 'NOT_FETCHED',
    recordedPayments: null,
    paymentInstallments: null,
    dataQualityFlags: [],
    ...p,
  };
}

const risk = (sourceWorkId: number, level: ProjectRisk['level'], score: number | null): ProjectRisk => ({
  sourceWorkId,
  level,
  score,
  reasons: [],
  assessedAt: null,
});

describe('aggregateMps', () => {
  const projects: Project[] = [
    project({
      sourceWorkId: 1,
      mpName: '  A. Kumar ',
      constituency: 'Ernakulam',
      state: 'Kerala',
      seenInRecommended: true,
      seenInCompleted: true,
      estimatedCost: { amount: 100, currency: 'INR' },
      recordedPayments: { amount: 90, currency: 'INR' },
    }),
    project({
      sourceWorkId: 2,
      mpName: 'A. Kumar',
      state: 'Kerala',
      seenInRecommended: true,
      estimatedCost: { amount: 300, currency: 'INR' },
    }),
    project({
      sourceWorkId: 3,
      mpName: 'B. Singh',
      state: 'Bihar',
      seenInRecommended: true,
      seenInCompleted: true,
    }),
    project({ sourceWorkId: 4, mpName: '  ' }), // blank MP — dropped
    project({ sourceWorkId: 5, mpName: null }), // null MP — dropped
  ];
  const risks: Record<number, ProjectRisk> = {
    1: risk(1, 'HIGH', 70),
    2: risk(2, 'LOW', 10),
    3: risk(3, 'UNKNOWN', null),
  };

  const mps = aggregateMps(projects, risks);

  it('groups by trimmed MP name and drops works with no MP', () => {
    expect(mps.map((m) => m.mpName)).toEqual(['A. Kumar', 'B. Singh']);
  });

  it('tallies works, recommended, completed and completion rate', () => {
    const a = mps.find((m) => m.mpName === 'A. Kumar')!;
    expect(a.works).toBe(2);
    expect(a.recommended).toBe(2);
    expect(a.completed).toBe(1);
    expect(a.completionRate).toBe(0.5);
  });

  it('sums estimated cost and recorded payments, and the payments/estimate ratio', () => {
    const a = mps.find((m) => m.mpName === 'A. Kumar')!;
    expect(a.estimatedCost.amount).toBe(400);
    expect(a.recordedPayments.amount).toBe(90);
    expect(a.paymentsToEstimateRatio).toBeCloseTo(0.225);
  });

  it('splits risk levels and computes flagged share + average score over assessed works', () => {
    const a = mps.find((m) => m.mpName === 'A. Kumar')!;
    expect(a.risk).toEqual({ HIGH: 1, MEDIUM: 0, LOW: 1, UNKNOWN: 0 });
    expect(a.flaggedShare).toBe(0.5); // 1 HIGH of 2 assessed
    expect(a.avgRiskScore).toBe(40); // (70 + 10) / 2
  });

  it('leaves completion rate / flagged share / avg score null when undefined', () => {
    const b = mps.find((m) => m.mpName === 'B. Singh')!;
    expect(b.completionRate).toBe(1);
    expect(b.paymentsToEstimateRatio).toBeNull(); // no estimated cost
    expect(b.flaggedShare).toBeNull(); // only work is UNKNOWN
    expect(b.avgRiskScore).toBeNull();
  });

  it('leaves allocation null for an MP not on the official list', () => {
    const a = mps.find((m) => m.mpName === 'A. Kumar')!;
    expect(a.allocated).toBeNull();
    expect(a.fundUtilisation).toBeNull();
  });
});

describe('aggregateMps — official allocation join', () => {
  it('joins the official allocation by normalised name and derives fund utilisation', () => {
    // "Adv Abhay Kumar Sinha" → normalises to "ABHAY KUMAR SINHA" (Bihar, ₹14.7 cr)
    const mps = aggregateMps(
      [
        project({
          sourceWorkId: 10,
          mpName: 'Adv Abhay Kumar Sinha',
          state: 'Bihar',
          seenInRecommended: true,
          estimatedCost: { amount: 73_500_000, currency: 'INR' },
        }),
      ],
      {},
    );
    const m = mps[0];
    expect(m.allocated).toBe(147_000_000);
    expect(m.fundUtilisation).toBeCloseTo(0.5); // 7.35 cr of 14.7 cr
  });

  it('breaks a same-name collision by state', () => {
    // "SANJAY SETH": LS Jharkhand (₹14.706 cr) vs RS Uttar Pradesh (₹14.7 cr)
    const [jh] = aggregateMps(
      [project({ sourceWorkId: 20, mpName: 'Sanjay Seth', state: 'Jharkhand', seenInRecommended: true })],
      {},
    );
    expect(jh.allocated).toBe(147_064_357.11);

    const [unknownState] = aggregateMps(
      [project({ sourceWorkId: 21, mpName: 'Sanjay Seth', state: 'Karnataka', seenInRecommended: true })],
      {},
    );
    expect(unknownState.allocated).toBeNull(); // tie can't be resolved → no guess
  });
});
