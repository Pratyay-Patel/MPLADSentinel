import { describe, expect, it } from 'vitest';

import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { demoProjects } from '../demo/fixtures';
import type { DataProvider } from '../DataProvider';
import type { Project } from '../types';
import { createAnalyticsService } from './analytics';

function money(amount: number) {
  return { amount, currency: 'INR' };
}

/** A minimal provider that only serves a hand-built project list. */
function providerWith(projects: Project[]): DataProvider {
  return {
    ...createDemoDataProvider(),
    listProjects: async () => projects,
  };
}

const base: Project = {
  sourceName: 'test',
  sourceWorkId: 0,
  workDescription: 'Test work',
  category: 'Roads',
  house: 'LOK_SABHA',
  lsTerm: 18,
  mpName: 'MP A',
  constituency: 'C1',
  state: 'Kerala',
  district: 'D1',
  locationRaw: null,
  estimatedCost: money(1_000_000),
  finalCost: null,
  recommendedOn: '2023-01-01',
  recommendedYear: 2023,
  completedOn: null,
  completionYear: null,
  sourceStatusRaw: null,
  expectedBeneficiaries: null,
  seenInRecommended: true,
  seenInCompleted: false,
  lifecycleState: 'RECOMMENDED',
  paymentDataState: 'FETCHED_PRESENT',
  recordedPayments: money(800_000),
  paymentInstallments: 1,
  dataQualityFlags: [],
};

describe('createAnalyticsService', () => {
  it('reports the provider source and dataset totals over the demo fixtures', async () => {
    const data = await createAnalyticsService(createDemoDataProvider()).load();
    expect(data.source).toBe('demo');
    expect(data.totalWorks).toBe(demoProjects.length);
    expect(data.recordedUtilisationPct).toBeGreaterThanOrEqual(0);
    expect(data.worksWithPayments + data.worksWithoutPayments).toBe(demoProjects.length);
  });

  it('scores utilisation only over works with both estimate and payment (missing ≠ zero)', async () => {
    const projects: Project[] = [
      { ...base, sourceWorkId: 1, state: 'Kerala', estimatedCost: money(1_000_000), recordedPayments: money(900_000) },
      // no payment record — must NOT drag Kerala's utilisation down
      {
        ...base,
        sourceWorkId: 2,
        state: 'Kerala',
        estimatedCost: money(1_000_000),
        paymentDataState: 'FETCHED_ABSENT',
        recordedPayments: null,
      },
      // payment but no estimate — must NOT inflate the numerator without a denominator
      {
        ...base,
        sourceWorkId: 3,
        state: 'Kerala',
        estimatedCost: null,
        recordedPayments: money(5_000_000),
      },
    ];
    const data = await createAnalyticsService(providerWith(projects)).load();

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
    const projects: Project[] = [
      { ...base, sourceWorkId: 1, mpName: 'High MP', estimatedCost: money(1_000_000), recordedPayments: money(950_000) },
      { ...base, sourceWorkId: 2, mpName: 'Low MP', estimatedCost: money(1_000_000), recordedPayments: money(300_000) },
    ];
    const data = await createAnalyticsService(providerWith(projects)).load();

    expect(data.buckets.map((b) => b.band)).toEqual(['High', 'Good', 'Moderate', 'Low']);
    expect(data.buckets.find((b) => b.band === 'High')!.mps).toBe(1);
    expect(data.buckets.find((b) => b.band === 'Low')!.mps).toBe(1);
    expect(data.mpsAnalysed).toBe(2);

    // the per-MP leaderboard is present and sorted by utilisation desc
    expect(data.mps.map((m) => m.mpName)).toEqual(['High MP', 'Low MP']);
    expect(data.mps[0].band).toBe('High');
    expect(data.mps[1].band).toBe('Low');
  });

  it('produces computed observations, not editorial text', async () => {
    const data = await createAnalyticsService(createDemoDataProvider()).load();
    expect(data.observations.length).toBeGreaterThan(0);
    expect(data.observations.some((o) => /unknown, not zero/i.test(o))).toBe(true);
  });
});
