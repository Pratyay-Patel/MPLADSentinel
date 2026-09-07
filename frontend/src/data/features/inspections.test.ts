import { describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { ProviderError } from '../errors';
import {
  ASSIGNMENT_STATUS_LABEL,
  createInspectionsService,
  nextAssignmentStatuses,
} from './inspections';

describe('createInspectionsService', () => {
  it('loads assignments, the officer list, and a sorted work picker', async () => {
    const { assignments, officers, works } =
      await createInspectionsService(createDemoDataProvider()).load();

    expect(assignments.length).toBeGreaterThan(0);
    expect(officers.map((o) => o.officerCode)).toEqual([
      'OFF101',
      'OFF102',
      'OFF103',
      'OFF104',
      'OFF105',
    ]);
    expect(works).toHaveLength(14);
    const labels = works.map((w) => w.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });

  it('assigns a work to an officer and then returns it from load()', async () => {
    const service = createInspectionsService(createDemoDataProvider());
    const { works } = await service.load();
    const target = works[3];

    const saved = await service.assign({
      sourceWorkId: target.sourceWorkId,
      officerCode: 'OFF104',
      dueDate: null,
      note: 'Check materials on site.',
    });

    expect(saved.status).toBe('ASSIGNED');
    expect(saved.officerCode).toBe('OFF104');
    expect(saved.sourceWorkId).toBe(target.sourceWorkId);

    const { assignments } = await service.load();
    expect(assignments.some((a) => a.id === saved.id)).toBe(true);
  });

  it('rejects an unknown officer', async () => {
    const service = createInspectionsService(createDemoDataProvider());
    const { works } = await service.load();
    await expect(
      service.assign({
        sourceWorkId: works[0].sourceWorkId,
        officerCode: 'OFF999',
        dueDate: null,
        note: null,
      }),
    ).rejects.toThrow(/Unknown field officer/i);
  });

  it('advances an assignment through the workflow but rejects a backwards move', async () => {
    const service = createInspectionsService(createDemoDataProvider());
    const { works } = await service.load();
    const created = await service.assign({
      sourceWorkId: works[5].sourceWorkId,
      officerCode: 'OFF105',
      dueDate: null,
      note: null,
    });

    const inProgress = await service.updateAssignment(created.id, { status: 'IN_PROGRESS' });
    expect(inProgress.status).toBe('IN_PROGRESS');
    const completed = await service.updateAssignment(created.id, { status: 'COMPLETED' });
    expect(completed.status).toBe('COMPLETED');

    await expect(
      service.updateAssignment(created.id, { status: 'ASSIGNED' }),
    ).rejects.toThrow(/Cannot move an assignment/i);
  });

  it('propagates a load failure', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listAssignments: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    await expect(createInspectionsService(provider).load()).rejects.toThrow('backend down');
  });
});

describe('nextAssignmentStatuses', () => {
  it('offers forward transitions only, and nothing once closed', () => {
    expect(nextAssignmentStatuses('ASSIGNED')).toEqual(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
    expect(nextAssignmentStatuses('IN_PROGRESS')).toEqual(['COMPLETED', 'CANCELLED']);
    expect(nextAssignmentStatuses('COMPLETED')).toEqual([]);
    expect(nextAssignmentStatuses('CANCELLED')).toEqual([]);
  });

  it('has a label for every status', () => {
    expect(ASSIGNMENT_STATUS_LABEL.ASSIGNED).toBe('Requested');
    expect(ASSIGNMENT_STATUS_LABEL.IN_PROGRESS).toBe('In progress');
  });
});
