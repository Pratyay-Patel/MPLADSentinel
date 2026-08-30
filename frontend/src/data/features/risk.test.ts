import { describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { ProviderError } from '../errors';
import { createRiskService } from './risk';

describe('createRiskService', () => {
  it('returns every work, most severe first, then by score descending', async () => {
    const service = createRiskService(createDemoDataProvider());
    const { rows } = await service.load();

    expect(rows).toHaveLength(14);

    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2, UNKNOWN: 3 } as const;
    for (let i = 1; i < rows.length; i += 1) {
      const prev = rows[i - 1].risk;
      const curr = rows[i].risk;
      expect(rank[prev.level]).toBeLessThanOrEqual(rank[curr.level]);
      if (prev.level === curr.level) {
        expect(prev.score ?? 0).toBeGreaterThanOrEqual(curr.score ?? 0);
      }
    }
  });

  it('tallies counts per level that sum to the row count', async () => {
    const service = createRiskService(createDemoDataProvider());
    const { rows, countsByLevel } = await service.load();

    const total =
      countsByLevel.HIGH + countsByLevel.MEDIUM + countsByLevel.LOW + countsByLevel.UNKNOWN;
    expect(total).toBe(rows.length);
    expect(countsByLevel.HIGH).toBeGreaterThan(0);
    expect(countsByLevel.UNKNOWN).toBeGreaterThan(0);
  });

  it('propagates a listProjects failure', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    await expect(createRiskService(provider).load()).rejects.toThrow('backend down');
  });

  it('falls back to UNKNOWN risk for every work when the bulk risk call fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjectRisks: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'risk down')),
    };
    const { rows } = await createRiskService(provider).load();

    expect(rows).toHaveLength(14);
    expect(rows.every((row) => row.risk.level === 'UNKNOWN')).toBe(true);
  });
});
