import { describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { createProjectsService } from './projects';

describe('ProjectsService', () => {
  it('delegates every call to the injected DataProvider', async () => {
    const provider = createDemoDataProvider();
    const spies = {
      listProjects: vi.spyOn(provider, 'listProjects'),
      getProject: vi.spyOn(provider, 'getProject'),
      getProjectSummary: vi.spyOn(provider, 'getProjectSummary'),
      getProjectRisk: vi.spyOn(provider, 'getProjectRisk'),
    };
    const service = createProjectsService(provider);

    await service.list();
    await service.get(1);
    await service.summary();
    await service.risk(1);

    expect(spies.listProjects).toHaveBeenCalledOnce();
    expect(spies.getProject).toHaveBeenCalledWith(1, undefined);
    expect(spies.getProjectSummary).toHaveBeenCalledOnce();
    expect(spies.getProjectRisk).toHaveBeenCalledWith(1, undefined);
  });

  it('is provider-agnostic — the same service code works over a stub provider', async () => {
    const stub: DataProvider = {
      source: 'demo',
      getBackendHealth: vi.fn(),
      listProjects: vi.fn().mockResolvedValue([]),
      getProject: vi.fn().mockResolvedValue(null),
      getProjectSummary: vi.fn(),
      getProjectRisk: vi.fn().mockResolvedValue(null),
      listProjectRisks: vi.fn().mockResolvedValue({}),
      getProjectPayments: vi.fn().mockResolvedValue([]),
      listPublicProjects: vi.fn().mockResolvedValue([]),
      getPublicProject: vi.fn().mockResolvedValue(null),
      listGrievances: vi.fn().mockResolvedValue([]),
      submitGrievance: vi.fn(),
      updateGrievanceStatus: vi.fn(),
      listFieldOfficers: vi.fn().mockResolvedValue([]),
      listAssignments: vi.fn().mockResolvedValue([]),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      requestAssignmentSignOff: vi.fn(),
      confirmAssignmentSignOff: vi.fn(),
      getAuditPhotos: vi.fn().mockResolvedValue({ photos: [], configured: false }),
      listNotifications: vi.fn().mockResolvedValue([]),
      markNotificationRead: vi.fn(),
      markAllNotificationsRead: vi.fn(),
      clearAllNotifications: vi.fn(),
      sendSlaNotice: vi.fn(),
    };
    const service = createProjectsService(stub);

    expect(await service.list()).toEqual([]);
    expect(await service.get(99)).toBeNull();
  });
});
