import { afterEach, describe, expect, it } from 'vitest';

import { clearDemoSession, writeDemoSession } from '../../auth/demoAuth';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { createNotificationsService } from './notifications';

describe('createNotificationsService (demo provider)', () => {
  afterEach(() => clearDemoSession());

  it('returns nothing for a role with no active session', async () => {
    const service = createNotificationsService(createDemoDataProvider());
    expect(await service.load()).toEqual([]);
  });

  it('seeds real high-risk-work alerts once per authority role, and does not duplicate on reload', async () => {
    writeDemoSession('MOSPI');
    const service = createNotificationsService(createDemoDataProvider());

    const first = await service.load();
    const highRiskFirst = first.filter((n) => n.category === 'HIGH_RISK_WORK');
    expect(highRiskFirst.length).toBeGreaterThan(0);

    const second = await service.load();
    const highRiskSecond = second.filter((n) => n.category === 'HIGH_RISK_WORK');
    expect(highRiskSecond.map((n) => n.id)).toEqual(highRiskFirst.map((n) => n.id));
  });

  it('never seeds high-risk-work alerts for a citizen', async () => {
    writeDemoSession('CITIZEN');
    const service = createNotificationsService(createDemoDataProvider());

    const list = await service.load();

    expect(list.filter((n) => n.category === 'HIGH_RISK_WORK')).toHaveLength(0);
  });

  it('sends an SLA notice that lands only in the District Authority persona’s feed', async () => {
    writeDemoSession('MOSPI');
    const provider = createDemoDataProvider();
    const service = createNotificationsService(provider);
    const works = await provider.listProjects();
    const target = works[0];

    await service.sendSlaNotice(target.sourceWorkId);

    const mospiFeed = await service.load();
    expect(mospiFeed.some((n) => n.category === 'SLA_NOTICE')).toBe(false);

    writeDemoSession('DISTRICT');
    const districtFeed = await service.load();
    const notice = districtFeed.find((n) => n.category === 'SLA_NOTICE');
    expect(notice).toBeDefined();
    expect(notice?.sourceWorkId).toBe(target.sourceWorkId);
    expect(notice?.read).toBe(false);
  });

  it('marks one notification read, marks all read, and clears all without deleting the underlying feed state', async () => {
    writeDemoSession('MOSPI');
    const provider = createDemoDataProvider();
    const service = createNotificationsService(provider);
    const projects = await provider.listProjects();

    await service.sendSlaNotice(projects[0].sourceWorkId);
    await service.sendSlaNotice(projects[1].sourceWorkId);

    writeDemoSession('DISTRICT');
    const beforeAny = await service.load();
    expect(beforeAny.every((n) => !n.read)).toBe(true);

    const [firstNotice] = beforeAny;
    const updated = await service.markRead(firstNotice.id);
    expect(updated.read).toBe(true);

    await service.markAllRead();
    const afterMarkAll = await service.load();
    expect(afterMarkAll.every((n) => n.read)).toBe(true);
    expect(afterMarkAll).toHaveLength(beforeAny.length);

    await service.clearAll();
    expect(await service.load()).toEqual([]);
  });
});
