import { describe, expect, it } from 'vitest';

import type { Project, ProjectRisk } from '../types';
import { alreadyReleasedAmount, evaluateFundEligibility, remainingFunds } from './fundEligibility';

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

function risk(overrides: Partial<ProjectRisk> = {}): ProjectRisk {
  return {
    sourceWorkId: 1,
    level: 'LOW',
    score: 10,
    reasons: [],
    assessedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('alreadyReleasedAmount', () => {
  it('is zero when payment data has not been fetched', () => {
    const p = project({ paymentDataState: 'NOT_FETCHED', recordedPayments: null });
    expect(alreadyReleasedAmount(p)).toBe(0);
  });

  it('is zero when payment data was fetched but is absent', () => {
    const p = project({ paymentDataState: 'FETCHED_ABSENT', recordedPayments: null });
    expect(alreadyReleasedAmount(p)).toBe(0);
  });

  it('is the recorded payments total once fetched and present', () => {
    const p = project({
      paymentDataState: 'FETCHED_PRESENT',
      recordedPayments: { amount: 300_000, currency: 'INR' },
    });
    expect(alreadyReleasedAmount(p)).toBe(300_000);
  });
});

describe('remainingFunds', () => {
  it('is null when there is no sanctioned amount', () => {
    const p = project({ estimatedCost: null });
    expect(remainingFunds(p)).toBeNull();
  });

  it('subtracts already-released payments from the sanctioned amount', () => {
    const p = project({
      estimatedCost: { amount: 1_000_000, currency: 'INR' },
      paymentDataState: 'FETCHED_PRESENT',
      recordedPayments: { amount: 400_000, currency: 'INR' },
    });
    expect(remainingFunds(p)).toBe(600_000);
  });
});

describe('evaluateFundEligibility', () => {
  it('rejects when the sanctioned amount is unknown', () => {
    const p = project({ estimatedCost: null });
    const decision = evaluateFundEligibility(p, 50_000, null);
    expect(decision.status).toBe('REJECTED');
    expect(decision.reason).toMatch(/sanctioned amount is not available/i);
  });

  it('rejects when the requested amount exceeds remaining funds', () => {
    const p = project({ estimatedCost: { amount: 500_000, currency: 'INR' } });
    const decision = evaluateFundEligibility(p, 600_000, null);
    expect(decision.status).toBe('REJECTED');
    expect(decision.reason).toMatch(/exceeds the remaining sanctioned funds/i);
  });

  it('accounts for already-released payments when computing remaining funds', () => {
    const p = project({
      estimatedCost: { amount: 1_000_000, currency: 'INR' },
      paymentDataState: 'FETCHED_PRESENT',
      recordedPayments: { amount: 700_000, currency: 'INR' },
    });
    const decision = evaluateFundEligibility(p, 400_000, null);
    expect(decision.status).toBe('REJECTED');
  });

  it('rejects when the work is assessed HIGH risk, even with sufficient funds', () => {
    const p = project({ estimatedCost: { amount: 1_000_000, currency: 'INR' } });
    const decision = evaluateFundEligibility(p, 100_000, risk({ level: 'HIGH', reasons: ['Payment concentration'] }));
    expect(decision.status).toBe('REJECTED');
    expect(decision.reason).toMatch(/HIGH risk/);
  });

  it('approves when funds are sufficient and risk is not HIGH', () => {
    const p = project({ estimatedCost: { amount: 1_000_000, currency: 'INR' } });
    const decision = evaluateFundEligibility(p, 100_000, risk({ level: 'LOW' }));
    expect(decision.status).toBe('APPROVED');
  });

  it('approves when risk has not been assessed', () => {
    const p = project({ estimatedCost: { amount: 1_000_000, currency: 'INR' } });
    const decision = evaluateFundEligibility(p, 100_000, null);
    expect(decision.status).toBe('APPROVED');
  });
});
