import { describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { ProviderError } from '../errors';
import { createProjectRegisterService } from './projectRegister';

describe('createProjectRegisterService', () => {
  it('returns every work sorted by description then id', async () => {
    const { rows } = await createProjectRegisterService(createDemoDataProvider()).load();

    expect(rows).toHaveLength(14);
    const descriptions = rows.map((r) => r.project.workDescription ?? '');
    expect(descriptions).toEqual([...descriptions].sort((a, b) => a.localeCompare(b)));
    expect(rows.every((r) => r.risk != null)).toBe(true);
  });

  it('derives filter option lists from the data', async () => {
    const { filterOptions } = await createProjectRegisterService(createDemoDataProvider()).load();

    expect(filterOptions.states).toContain('Kerala');
    expect(filterOptions.states).toEqual(
      [...filterOptions.states].sort((a, b) => a.localeCompare(b)),
    );
    expect(filterOptions.houses).toEqual(['LOK_SABHA', 'RAJYA_SABHA']);
    expect(filterOptions.lifecycleStates).toContain('RECOMMENDED');
    expect(filterOptions.riskLevels).toContain('HIGH');
    expect(filterOptions.riskLevels).toContain('UNKNOWN');
    // risk levels keep severity order
    expect(filterOptions.riskLevels).toEqual(
      ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].filter((l) =>
        filterOptions.riskLevels.includes(l as never),
      ),
    );
  });

  it('propagates a listProjects failure', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    await expect(createProjectRegisterService(provider).load()).rejects.toThrow('backend down');
  });
});
