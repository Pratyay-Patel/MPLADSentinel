import { describe, expect, it } from 'vitest';

import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { demoProjects } from '../demo/fixtures';
import type { DataProvider } from '../DataProvider';
import type { PublicProject } from '../publicProject';
import { createCitizenAnalyticsService } from './citizenAnalytics';

function money(amount: number) {
  return { amount, currency: 'INR' };
}

/** A minimal provider that only serves a hand-built public project list. */
function providerWith(projects: PublicProject[]): DataProvider {
  return {
    ...createDemoDataProvider(),
    listPublicProjects: async () => projects,
  };
}

const base: PublicProject = {
  reference: 0,
  workDescription: 'Test work',
  category: 'Roads',
  state: 'Kerala',
  district: 'D1',
  location: null,
  house: 'LOK_SABHA',
  lsTerm: 18,
  memberOfParliament: 'MP A',
  constituency: 'C1',
  estimatedCost: money(1_000_000),
  finalCost: null,
  status: 'RECOMMENDED',
  sourceStatus: null,
  expectedBeneficiaries: null,
  recommendedOn: '2023-01-01',
  recommendedYear: 2023,
  completedOn: null,
  completionYear: null,
  paymentDataState: 'FETCHED_PRESENT',
  recordedPayments: money(800_000),
  paymentInstallments: 1,
};

describe('createCitizenAnalyticsService', () => {
  it('reports the provider source and dataset totals over the demo fixtures', async () => {
    const data = await createCitizenAnalyticsService(createDemoDataProvider()).load();
    expect(data.source).toBe('demo');
    expect(data.totalWorks).toBe(demoProjects.length);
    expect(data.recordedUtilisationPct).toBeGreaterThanOrEqual(0);
    expect(data.worksWithPayments + data.worksWithoutPayments).toBe(demoProjects.length);
    expect(JSON.stringify(data)).not.toMatch(/risk/i);
  });

  it('scores utilisation only over works with both estimate and payment (missing ≠ zero)', async () => {
    const projects: PublicProject[] = [
      { ...base, reference: 1, state: 'Kerala', estimatedCost: money(1_000_000), recordedPayments: money(900_000) },
      // no payment record — must NOT drag Kerala's utilisation down
      {
        ...base,
        reference: 2,
        state: 'Kerala',
        estimatedCost: money(1_000_000),
        paymentDataState: 'FETCHED_ABSENT',
        recordedPayments: null,
      },
      // payment but no estimate — must NOT inflate the numerator without a denominator
      {
        ...base,
        reference: 3,
        state: 'Kerala',
        estimatedCost: null,
        recordedPayments: money(5_000_000),
      },
    ];
    const data = await createCitizenAnalyticsService(providerWith(projects)).load();

    const kerala = data.states.find((s) => s.state === 'Kerala');
    expect(kerala).toBeDefined();
    expect(kerala!.works).toBe(3);
    expect(kerala!.worksScored).toBe(1);
    // 900k / 1,000k = 90% — the absent-payment and no-estimate works are excluded
    expect(Math.round(kerala!.utilisationPct)).toBe(90);
    expect(kerala!.band).toBe('High');
    expect(data.worksWithoutPayments).toBe(1);
  });

  it('buckets MPs into the four utilisation bands and lists them best first', async () => {
    const projects: PublicProject[] = [
      { ...base, reference: 1, memberOfParliament: 'High MP', estimatedCost: money(1_000_000), recordedPayments: money(950_000) },
      { ...base, reference: 2, memberOfParliament: 'Low MP', estimatedCost: money(1_000_000), recordedPayments: money(300_000) },
    ];
    const data = await createCitizenAnalyticsService(providerWith(projects)).load();

    expect(data.buckets.map((b) => b.band)).toEqual(['High', 'Good', 'Moderate', 'Low']);
    expect(data.buckets.find((b) => b.band === 'High')!.mps).toBe(1);
    expect(data.buckets.find((b) => b.band === 'Low')!.mps).toBe(1);
    expect(data.mpsAnalysed).toBe(2);

    expect(data.mps.map((m) => m.mpName)).toEqual(['High MP', 'Low MP']);
    expect(data.mps[0].band).toBe('High');
    expect(data.mps[1].band).toBe('Low');
  });

  it('produces computed observations, not editorial text', async () => {
    const data = await createCitizenAnalyticsService(createDemoDataProvider()).load();
    expect(data.observations.length).toBeGreaterThan(0);
    expect(data.observations.some((o) => /unknown, not zero/i.test(o))).toBe(true);
  });

  it('counts completed works from status, since PublicProject has no seenInCompleted flag', async () => {
    const projects: PublicProject[] = [
      { ...base, reference: 1, status: 'COMPLETED' },
      { ...base, reference: 2, status: 'RECOMMENDED_AND_COMPLETED' },
      { ...base, reference: 3, status: 'RECOMMENDED' },
    ];
    const data = await createCitizenAnalyticsService(providerWith(projects)).load();
    expect(data.completedWorks).toBe(2);
    expect(data.notCompletedWorks).toBe(1);
  });
});
