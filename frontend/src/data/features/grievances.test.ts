import { describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { ProviderError } from '../errors';
import { createGrievancesService, GRIEVANCE_CATEGORIES } from './grievances';

describe('createGrievancesService', () => {
  it('loads existing grievances plus a sorted list of work options', async () => {
    const { grievances, workOptions } =
      await createGrievancesService(createDemoDataProvider()).load();

    expect(Array.isArray(grievances)).toBe(true);
    expect(workOptions).toHaveLength(14);
    const labels = workOptions.map((o) => o.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    expect(GRIEVANCE_CATEGORIES.length).toBeGreaterThan(2);
  });

  it('submits a grievance and then returns it from load()', async () => {
    const service = createGrievancesService(createDemoDataProvider());

    const saved = await service.submit({
      workReference: null,
      category: 'Other',
      subject: 'Test subject',
      description: 'A description that is comfortably long enough.',
      contactName: null,
      contactEmail: null,
    });
    expect(saved.status).toBe('SUBMITTED');

    const { grievances } = await service.load();
    expect(grievances.some((g) => g.id === saved.id)).toBe(true);
  });

  it('propagates a load failure', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listGrievances: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    await expect(createGrievancesService(provider).load()).rejects.toThrow('backend down');
  });
});
