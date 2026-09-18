import { describe, expect, it } from 'vitest';

import { createDemoDataProvider } from '../demo/DemoDataProvider';
import type { PublicProject } from '../publicProject';
import { aggregateCitizenMps, createCitizenMpComparisonService } from './citizenMpComparison';

function work(overrides: Partial<PublicProject>): PublicProject {
  return {
    reference: 1,
    workDescription: null,
    category: null,
    state: 'Kerala',
    district: null,
    location: null,
    house: 'LOK_SABHA',
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

describe('aggregateCitizenMps', () => {
  it('aggregates per MP with no risk fields anywhere in the output', () => {
    const mps = aggregateCitizenMps([
      work({
        reference: 1,
        memberOfParliament: '  A. Kumar ',
        constituency: 'Ernakulam',
        state: 'Kerala',
        status: 'RECOMMENDED_AND_COMPLETED',
        estimatedCost: { amount: 100, currency: 'INR' },
        paymentDataState: 'FETCHED_PRESENT',
        recordedPayments: { amount: 90, currency: 'INR' },
      }),
      work({
        reference: 2,
        memberOfParliament: 'A. Kumar',
        constituency: 'Ernakulam',
        state: 'Kerala',
        status: 'RECOMMENDED',
        estimatedCost: { amount: 200, currency: 'INR' },
      }),
      work({
        reference: 3,
        memberOfParliament: null,
        state: 'Bihar',
      }),
    ]);

    expect(mps).toHaveLength(1);
    const [a] = mps;
    expect(a.mpName).toBe('A. Kumar');
    expect(a.works).toBe(2);
    expect(a.recommended).toBe(2);
    expect(a.completed).toBe(1);
    expect(a.completionRate).toBeCloseTo(0.5);
    expect(a.estimatedCost).toEqual({ amount: 300, currency: 'INR' });
    expect(a.recordedPayments).toEqual({ amount: 90, currency: 'INR' });

    expect(JSON.stringify(mps)).not.toMatch(/risk/i);
  });

  it('skips works with no MP recorded', () => {
    expect(aggregateCitizenMps([work({ memberOfParliament: null })])).toEqual([]);
  });
});

describe('createCitizenMpComparisonService', () => {
  it('loads from the provider public projections', async () => {
    const data = await createCitizenMpComparisonService(createDemoDataProvider()).load();
    expect(data.mps.length).toBeGreaterThan(0);
  });
});
