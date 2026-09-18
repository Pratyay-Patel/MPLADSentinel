import { describe, expect, it } from 'vitest';

import { createDemoDataProvider } from '../demo/DemoDataProvider';
import type { PublicProject } from '../publicProject';
import { buildCitizenOverview, createCitizenOverviewService } from './citizenOverview';

function work(overrides: Partial<PublicProject>): PublicProject {
  return {
    reference: 1,
    workDescription: null,
    category: null,
    state: 'Kerala',
    district: null,
    location: null,
    house: null,
    lsTerm: null,
    memberOfParliament: null,
    constituency: null,
    estimatedCost: null,
    finalCost: null,
    status: 'RECOMMENDED',
    sourceStatus: null,
    expectedBeneficiaries: null,
    recommendedOn: null,
    recommendedYear: null,
    completedOn: null,
    completionYear: null,
    paymentDataState: 'NOT_FETCHED',
    recordedPayments: null,
    paymentInstallments: null,
    ...overrides,
  };
}

describe('buildCitizenOverview', () => {
  it('rolls up counts, completion rate and money totals with no risk data anywhere', () => {
    const overview = buildCitizenOverview([
      work({
        reference: 1,
        state: 'Kerala',
        status: 'COMPLETED',
        estimatedCost: { amount: 100, currency: 'INR' },
        paymentDataState: 'FETCHED_PRESENT',
        recordedPayments: { amount: 80, currency: 'INR' },
      }),
      work({
        reference: 2,
        state: 'Kerala',
        status: 'RECOMMENDED',
        estimatedCost: { amount: 200, currency: 'INR' },
      }),
      work({
        reference: 3,
        state: 'Bihar',
        status: 'RECOMMENDED_AND_COMPLETED',
        estimatedCost: null,
      }),
    ]);

    expect(overview.totalWorks).toBe(3);
    expect(overview.recommendedWorks).toBe(2);
    expect(overview.completedWorks).toBe(2);
    expect(overview.completionRatePct).toBeCloseTo((2 / 3) * 100);
    expect(overview.totalEstimatedCost).toEqual({ amount: 300, currency: 'INR' });
    expect(overview.totalRecordedPayments).toEqual({ amount: 80, currency: 'INR' });
    expect(overview.states).toEqual([
      { state: 'Kerala', works: 2 },
      { state: 'Bihar', works: 1 },
    ]);

    expect(JSON.stringify(overview)).not.toMatch(/risk/i);
  });

  it('returns a null completion rate and zero totals for an empty dataset', () => {
    const overview = buildCitizenOverview([]);
    expect(overview.totalWorks).toBe(0);
    expect(overview.completionRatePct).toBeNull();
    expect(overview.totalEstimatedCost).toEqual({ amount: 0, currency: 'INR' });
    expect(overview.states).toEqual([]);
  });
});

describe('createCitizenOverviewService', () => {
  it('loads from the provider public projections', async () => {
    const data = await createCitizenOverviewService(createDemoDataProvider()).load();
    expect(data.totalWorks).toBeGreaterThan(0);
    expect(data.states.length).toBeGreaterThan(0);
  });
});
