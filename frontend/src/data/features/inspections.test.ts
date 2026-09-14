import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearDemoSession, writeDemoSession } from '../../auth/demoAuth';
import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { ProviderError } from '../errors';
import {
  ASSIGNMENT_STATUS_LABEL,
  clampPhotoCount,
  createInspectionsService,
  nextAssignmentStatuses,
} from './inspections';

describe('createInspectionsService', () => {
  afterEach(() => clearDemoSession());

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
      requiredPhotos: 5,
    });

    expect(saved.status).toBe('ASSIGNED');
    expect(saved.officerCode).toBe('OFF104');
    expect(saved.sourceWorkId).toBe(target.sourceWorkId);
    expect(saved.requiredPhotos).toBe(5);

    const { assignments } = await service.load();
    expect(assignments.some((a) => a.id === saved.id)).toBe(true);
  });

  it('clamps an out-of-range photo count and lets it be edited afterwards', async () => {
    const service = createInspectionsService(createDemoDataProvider());
    const { works } = await service.load();

    const saved = await service.assign({
      sourceWorkId: works[7].sourceWorkId,
      officerCode: 'OFF102',
      dueDate: null,
      note: null,
      requiredPhotos: 99,
    });
    expect(saved.requiredPhotos).toBe(20); // clamped to the 1–20 range

    const edited = await service.updateAssignment(saved.id, { requiredPhotos: 6 });
    expect(edited.requiredPhotos).toBe(6);
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
        requiredPhotos: 2,
      }),
    ).rejects.toThrow(/Unknown field officer/i);
  });

  it('advances an assignment to IN_PROGRESS but rejects a backwards move', async () => {
    const service = createInspectionsService(createDemoDataProvider());
    const { works } = await service.load();
    const created = await service.assign({
      sourceWorkId: works[5].sourceWorkId,
      officerCode: 'OFF105',
      dueDate: null,
      note: null,
      requiredPhotos: 2,
    });

    const inProgress = await service.updateAssignment(created.id, { status: 'IN_PROGRESS' });
    expect(inProgress.status).toBe('IN_PROGRESS');

    await expect(
      service.updateAssignment(created.id, { status: 'ASSIGNED' }),
    ).rejects.toThrow(/Cannot move an assignment/i);
  });

  it('rejects completing/cancelling directly — dual-authority sign-off is required', async () => {
    const service = createInspectionsService(createDemoDataProvider());
    const { works } = await service.load();
    const created = await service.assign({
      sourceWorkId: works[6].sourceWorkId,
      officerCode: 'OFF104',
      dueDate: null,
      note: null,
      requiredPhotos: 2,
    });

    await expect(
      service.updateAssignment(created.id, { status: 'COMPLETED' }),
    ).rejects.toThrow(/dual-authority sign-off/i);
  });

  it('requires a different authority to confirm a sign-off, and merges both justifications', async () => {
    const service = createInspectionsService(createDemoDataProvider());
    const { works } = await service.load();
    const created = await service.assign({
      sourceWorkId: works[7].sourceWorkId,
      officerCode: 'OFF103',
      dueDate: null,
      note: null,
      requiredPhotos: 2,
    });

    writeDemoSession('MOSPI');
    const requested = await service.requestSignOff(created.id, {
      targetStatus: 'COMPLETED',
      justification: 'Verified on-site.',
    });
    expect(requested.status).toBe('ASSIGNED');
    expect(requested.pendingStatus).toBe('COMPLETED');
    expect(requested.pendingRequestedByUsername).toBe('mospi');

    // Same authority (still logged in as MOSPI) cannot confirm its own request.
    await expect(
      service.confirmSignOff(created.id, { justification: 'Confirming my own request.' }),
    ).rejects.toThrow(/different authority/i);

    // A different authority can.
    writeDemoSession('DISTRICT');
    const confirmed = await service.confirmSignOff(created.id, {
      justification: 'Independently reviewed.',
    });
    expect(confirmed.status).toBe('COMPLETED');
    expect(confirmed.pendingStatus).toBeNull();
    expect(confirmed.note).toContain('Verified on-site.');
    expect(confirmed.note).toContain('Independently reviewed.');
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

describe('clampPhotoCount', () => {
  it('bounds to 1–20 and defaults non-numbers to 2', () => {
    expect(clampPhotoCount(0)).toBe(1);
    expect(clampPhotoCount(21)).toBe(20);
    expect(clampPhotoCount(7)).toBe(7);
    expect(clampPhotoCount(3.6)).toBe(4);
    expect(clampPhotoCount(Number.NaN)).toBe(2);
  });
});
