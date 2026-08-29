import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppShell } from './AppShell';

function renderAt(path: string) {
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
  return render(<RouterProvider router={router} />);
}

const NAV_LABELS = [
  'Overview',
  'Projects',
  'Risk & Alerts',
  'Audit',
  'Citizen Portal',
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

  it('renders every primary navigation item', () => {
    renderAt('/');
    for (const label of NAV_LABELS) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
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
});
