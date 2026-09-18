import { describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { ProviderError } from '../errors';
import { createCitizenService, toPublicProject } from './citizen';

const INTERNAL_KEYS = ['sourceName', 'dataQualityFlags', 'seenInRecommended', 'seenInCompleted', 'risk'];

describe('toPublicProject', () => {
  it('carries only publicly releasable fields', async () => {
    const [project] = await createDemoDataProvider().listProjects();
    const publicProject = toPublicProject(project);

    for (const key of INTERNAL_KEYS) {
      expect(key in publicProject).toBe(false);
    }
    expect(publicProject.reference).toBe(project.sourceWorkId);
    expect(publicProject.memberOfParliament).toBe(project.mpName);
    expect(publicProject.estimatedCost).toEqual(project.estimatedCost);
  });

  it('carries the recorded-payment summary (public expenditure data, not a risk signal)', async () => {
    const [project] = await createDemoDataProvider().listProjects();
    const publicProject = toPublicProject(project);

    expect(publicProject.paymentDataState).toBe(project.paymentDataState);
    expect(publicProject.recordedPayments).toEqual(project.recordedPayments);
    expect(publicProject.paymentInstallments).toBe(project.paymentInstallments);
  });
});

describe('createCitizenService', () => {
  it('lists every work as a PublicProject, sorted by description', async () => {
    const { projects, filterOptions } = await createCitizenService(createDemoDataProvider()).list();

    expect(projects).toHaveLength(14);
    const names = projects.map((p) => p.workDescription ?? '');
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    for (const project of projects) {
      for (const key of INTERNAL_KEYS) expect(key in project).toBe(false);
    }
    expect(filterOptions.states).toContain('Kerala');
    expect(filterOptions.categories.length).toBeGreaterThan(1);
  });

  it('gets one work by reference, or null for an unknown id', async () => {
    const service = createCitizenService(createDemoDataProvider());
    const found = await service.get(900_000_002);
    expect(found?.reference).toBe(900_000_002);
    expect('dataQualityFlags' in (found ?? {})).toBe(false);

    expect(await service.get(-1)).toBeNull();
  });

  it('gets payment installments for a work via the public track', async () => {
    const service = createCitizenService(createDemoDataProvider());
    const [project] = await createDemoDataProvider().listProjects();
    const payments = await service.getPayments(project.sourceWorkId);
    expect(Array.isArray(payments)).toBe(true);
  });

  it('propagates a listPublicProjects failure', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listPublicProjects: vi
        .fn()
        .mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    await expect(createCitizenService(provider).list()).rejects.toThrow('backend down');
  });
});
