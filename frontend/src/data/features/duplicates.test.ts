import { describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { ProviderError } from '../errors';
import type { DuplicatePairsResult } from '../types';
import { createDuplicatesService } from './duplicates';

describe('createDuplicatesService', () => {
  it('delegates to the provider unchanged', async () => {
    const result: DuplicatePairsResult = { pairs: [], totalFound: 0 };
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listDuplicateWorks: vi.fn().mockResolvedValue(result),
    };

    expect(await createDuplicatesService(provider).load()).toBe(result);
    expect(provider.listDuplicateWorks).toHaveBeenCalledWith(undefined);
  });

  it('propagates a listDuplicateWorks failure', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listDuplicateWorks: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    await expect(createDuplicatesService(provider).load()).rejects.toThrow('backend down');
  });
});
