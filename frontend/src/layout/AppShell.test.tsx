import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SessionProvider } from '../auth';
import type { Role } from '../auth';
import { DataProviderProvider } from '../data';
import { createDemoDataProvider } from '../data/demo/DemoDataProvider';
import { AppShell } from './AppShell';

function renderAt(path: string, role: Role = 'MOSPI') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <p>home content</p> },
          { path: 'projects', element: <p>projects content</p> },
          { path: 'risk', element: <p>risk content</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(
    <SessionProvider initialRole={role}>
      <DataProviderProvider provider={createDemoDataProvider()}>
        <RouterProvider router={router} />
      </DataProviderProvider>
    </SessionProvider>,
  );
}

const NAV_LABELS = [
  'Overview',
  'Projects',
  'Risk & Alerts',
  'Duplicate Works',
  'Compare MPs',
  'Inspections',
  'Analytics',
  'Assistant',
  'Audit',
  'Citizen Portal',
  'Recommended Works',
  'Grievances',
];

describe('AppShell', () => {
  it('renders the shell landmarks and routed content', () => {
    renderAt('/');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
    expect(screen.getByText('home content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
  });

  it('renders every primary navigation item for an authority role', () => {
    renderAt('/');
    for (const label of NAV_LABELS) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('hides authority-only nav items for the Citizen role', () => {
    renderAt('/', 'CITIZEN');
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Citizen Portal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Grievances' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Risk & Alerts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Duplicate Works' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Inspections' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Audit' })).not.toBeInTheDocument();
  });

  it('marks the current route in the navigation', () => {
    renderAt('/projects');
    const active = screen.getByRole('link', { name: 'Projects', current: 'page' });
    expect(active).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('toggles the mobile navigation drawer from the header button', () => {
    renderAt('/');
    const open = screen.getByRole('button', { name: /open navigation/i });
    expect(open).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(open);

    const close = screen.getByRole('button', { name: /close navigation/i });
    expect(close).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Section navigation')).toHaveAttribute('data-open', 'true');
  });

  it('shows the signed-in user and a sign-out control in the header', () => {
    renderAt('/');
    expect(screen.getByText('MoSPI / Ministry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('collapses the sidebar to an icon rail and remembers it', () => {
    localStorage.removeItem('mplads.navCollapsed');
    const { unmount } = renderAt('/');

    const collapse = screen.getByRole('button', { name: /collapse sidebar/i });
    expect(collapse).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Section navigation')).not.toHaveAttribute('data-collapsed');

    fireEvent.click(collapse);

    expect(screen.getByRole('button', { name: /expand sidebar/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Section navigation')).toHaveAttribute('data-collapsed', 'true');
    expect(localStorage.getItem('mplads.navCollapsed')).toBe('1');
    // labels still present for a11y even when visually hidden
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();

    unmount();
    renderAt('/');
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    localStorage.removeItem('mplads.navCollapsed');
  });
});
