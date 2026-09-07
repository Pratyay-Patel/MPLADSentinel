import { describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { ProviderError } from '../errors';
import { createAuditService, DEMO_INSPECTION_FINDINGS } from './audit';

describe('createAuditService', () => {
  it('groups assignments into one entry per work, newest activity first', async () => {
    const { works } = await createAuditService(createDemoDataProvider()).load();

    expect(works.length).toBeGreaterThan(0);
    // one group per distinct work id
    const ids = works.map((w) => w.sourceWorkId);
    expect(new Set(ids).size).toBe(ids.length);
    // ordered by the latest assignment's updatedAt, descending
    const updated = works.map((w) => w.latest.updatedAt);
    expect(updated).toEqual([...updated].sort((a, b) => b.localeCompare(a)));
    // the demo seed includes a completed inspection
    expect(works.some((w) => w.latest.status === 'COMPLETED')).toBe(true);
  });

  it('forwards evidence lookups (with the photo limit) to the provider', async () => {
    const spy = vi
      .fn()
      .mockResolvedValue({ photos: [{ cid: 'bafyX', name: 'a.jpg', url: 'g/bafyX' }], configured: true });
    const provider: DataProvider = { ...createDemoDataProvider(), getAuditPhotos: spy };

    const result = await createAuditService(provider).evidence(4213908, 5);

    expect(spy).toHaveBeenCalledWith(4213908, 5, undefined);
    expect(result.photos).toHaveLength(1);
  });

  it('propagates a load failure', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listAssignments: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    await expect(createAuditService(provider).load()).rejects.toThrow('backend down');
  });

  it('exposes the illustrative findings used by the completed-inspection block', () => {
    expect(DEMO_INSPECTION_FINDINGS.map((f) => f.label)).toContain('Project operational');
    expect(DEMO_INSPECTION_FINDINGS.find((f) => f.label === 'Project operational')?.value).toBe(false);
  });
});
