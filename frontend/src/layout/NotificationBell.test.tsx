import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { clearDemoSession, writeDemoSession } from '../auth/demoAuth';
import { SessionProvider } from '../auth/SessionProvider';
import { DataProviderProvider } from '../data';
import { createDemoDataProvider } from '../data/demo/DemoDataProvider';
import { NotificationBell } from './NotificationBell';

// DISTRICT is a risk-visible authority role, so opening the bell as DISTRICT
// always seeds the real HIGH_RISK_WORK bootstrap (once, ever, for that persona
// — see DemoDataProvider) alongside whatever this test itself sends. Assertions
// below are written to hold regardless of that baseline: presence/absence of
// the unread badge, not an exact count.
function renderBell(provider = createDemoDataProvider()) {
  return render(
    <SessionProvider initialRole="DISTRICT">
      <DataProviderProvider provider={provider}>
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      </DataProviderProvider>
    </SessionProvider>,
  );
}

async function openPanel() {
  fireEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
  return screen.findByRole('dialog', { name: 'Notifications' });
}

describe('NotificationBell', () => {
  afterEach(() => clearDemoSession());

  it('lists a real SLA notice sent to this persona, unread', async () => {
    writeDemoSession('DISTRICT');
    const provider = createDemoDataProvider();
    const projects = await provider.listProjects();
    await provider.sendSlaNotice(projects[0].sourceWorkId);

    renderBell(provider);
    await openPanel();

    const notice = await screen.findByText(/Attention required/);
    const item = notice.closest('.notif-item');
    expect(item).not.toBeNull();
    expect(item).toHaveAttribute('data-unread');
  });

  it('marks all as read, clearing the unread badge entirely', async () => {
    writeDemoSession('DISTRICT');
    const provider = createDemoDataProvider();
    const projects = await provider.listProjects();
    await provider.sendSlaNotice(projects[0].sourceWorkId);
    await provider.sendSlaNotice(projects[1].sourceWorkId);

    renderBell(provider);
    await openPanel();
    expect(screen.getByRole('button', { name: /Notifications, \d+ unread/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));

    // No unread badge left — the accessible name drops the "N unread" suffix.
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    for (const item of document.querySelectorAll('.notif-item')) {
      expect(item).not.toHaveAttribute('data-unread');
    }
  });

  it('clears all notifications from the list, and the backend feed stays empty on reload', async () => {
    writeDemoSession('DISTRICT');
    const provider = createDemoDataProvider();
    const projects = await provider.listProjects();
    await provider.sendSlaNotice(projects[0].sourceWorkId);

    renderBell(provider);
    await openPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(await screen.findByText('No notifications.')).toBeInTheDocument();
    expect(await provider.listNotifications()).toEqual([]);
  });
});
