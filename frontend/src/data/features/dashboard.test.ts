import { describe, expect, it, vi } from 'vitest';

import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { demoProjects } from '../demo/fixtures';
import type { DataProvider } from '../DataProvider';
import { ProviderError } from '../errors';
import type { ProjectRisk } from '../types';
import {
  buildFilterOptions,
  createDashboardService,
  riskHeadline,
  topStatesByWorkCount,
} from './dashboard';

describe('createDashboardService (demo provider)', () => {
  const service = createDashboardService(createDemoDataProvider());

  it('reports the provider source and the national overview metrics', async () => {
    const data = await service.load();
    expect(data.source).toBe('demo');
    expect(data.totalWorks).toBe(demoProjects.length);
    expect(data.recommendedWorks).toBe(demoProjects.filter((p) => p.seenInRecommended).length);
    expect(data.completedWorks).toBe(demoProjects.filter((p) => p.seenInCompleted).length);
    expect(data.recordedPayments.currency).toBe('INR');
    expect(data.recordedPayments.amount).toBeGreaterThan(0);
  });

  it('builds a HIGH-first, capped attention list of only HIGH/MEDIUM risks', async () => {
    const data = await service.load();
    expect(data.attention.length).toBeGreaterThan(0);
    expect(data.attention.length).toBeLessThanOrEqual(6);
    expect(data.attention.every((i) => ['HIGH', 'MEDIUM'].includes(i.risk.level))).toBe(true);
    const levels = data.attention.map((i) => i.risk.level);
    const firstMedium = levels.indexOf('MEDIUM');
    if (firstMedium !== -1) {
      expect(levels.slice(firstMedium).every((l) => l === 'MEDIUM')).toBe(true);
    }
    expect(data.attention[0].risk.level).toBe('HIGH');
  });

  it('derives top states and filter options from the dataset', async () => {
    const data = await service.load();
    expect(data.topStates[0].works).toBeGreaterThanOrEqual(
      data.topStates[data.topStates.length - 1].works,
    );
    expect(data.filterOptions.states).toContain('Kerala');
    expect(data.filterOptions.categories.length).toBeGreaterThan(1);
    // years sorted descending
    expect(data.filterOptions.years).toEqual([...data.filterOptions.years].sort((a, b) => b - a));
  });
});

describe('createDashboardService risk resilience', () => {
  it('falls back to UNKNOWN risk when the provider risk call rejects', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      getProjectRisk: vi.fn().mockRejectedValue(new ProviderError('notImplemented', 'no risk api')),
    };
    const data = await createDashboardService(provider).load();
    expect(Object.values(data.risksByWorkId).every((r) => r.level === 'UNKNOWN')).toBe(true);
    expect(data.attention).toHaveLength(0);
  });

  it('propagates a hard provider failure (listProjects) as a rejection', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    await expect(createDashboardService(provider).load()).rejects.toBeInstanceOf(ProviderError);
  });
});

describe('dashboard pure helpers', () => {
  it('topStatesByWorkCount counts and sorts', () => {
    const top = topStatesByWorkCount([...demoProjects], 3);
    expect(top).toHaveLength(3);
    expect(top[0].works).toBeGreaterThanOrEqual(top[1].works);
  });

  it('buildFilterOptions returns sorted distinct values', () => {
    const options = buildFilterOptions([...demoProjects]);
    expect(options.states).toEqual([...options.states].sort((a, b) => a.localeCompare(b)));
    expect(new Set(options.districts).size).toBe(options.districts.length);
  });

  it('riskHeadline summarises reasons', () => {
    const two: ProjectRisk = {
      sourceWorkId: 1,
      level: 'HIGH',
      score: 70,
      reasons: ['reason a', 'reason b'],
      assessedAt: null,
    };
    const one: ProjectRisk = { ...two, reasons: ['cost anomaly detected'] };
    const unknown: ProjectRisk = { ...two, level: 'UNKNOWN', reasons: [] };
    expect(riskHeadline(two)).toBe('2 indicators detected');
    expect(riskHeadline(one)).toBe('cost anomaly detected');
    expect(riskHeadline(unknown)).toBe('Not yet assessed');
  });
});
