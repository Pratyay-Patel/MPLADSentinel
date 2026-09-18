import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../api/auth';
import { SessionProvider } from '../auth';
import { PersonaSwitcher } from './PersonaSwitcher';

vi.mock('../api/auth');
const mockedAuth = vi.mocked(authApi);

function renderSwitcher(initialPath = '/dashboard') {
  const router = createMemoryRouter(
    [
      { path: '/dashboard', element: <PersonaSwitcher /> },
      { path: '/citizen', element: <p>citizen portal screen</p> },
      { path: '/login', element: <p>login screen</p> },
    ],
    { initialEntries: [initialPath] },
  );
  return render(
    <SessionProvider initialRole="MOSPI">
      <RouterProvider router={router} />
    </SessionProvider>,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('PersonaSwitcher — demo build (VITE_DEMO_AUTH=true)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DEMO_AUTH', 'true');
  });

  it('shows the active persona and lists all six on open', () => {
    renderSwitcher();

    expect(screen.getByRole('button', { name: /Role: MoSPI \/ Ministry/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Role: MoSPI \/ Ministry/ }));

    const menu = screen.getByRole('listbox', { name: 'Authority persona' });
    expect(menu).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(6);
    expect(screen.getByRole('option', { name: /MoSPI \/ Ministry/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('switches persona directly (no sign-out) and navigates to that role’s landing page', async () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: /Role: MoSPI \/ Ministry/ }));
    fireEvent.click(screen.getByRole('option', { name: /Citizen/ }));

    expect(await screen.findByText('citizen portal screen')).toBeInTheDocument();
    expect(mockedAuth.logout).not.toHaveBeenCalled();
  });

  it('closes without switching when the active persona is clicked again', () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: /Role: MoSPI \/ Ministry/ }));
    fireEvent.click(screen.getByRole('option', { name: /MoSPI \/ Ministry/ }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Role: MoSPI \/ Ministry/ })).toBeInTheDocument();
  });
});

describe('PersonaSwitcher — real backend build (no VITE_DEMO_AUTH)', () => {
  it('signs out and sends the user to /login instead of switching directly', async () => {
    mockedAuth.logout.mockResolvedValue(undefined);
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: /Role: MoSPI \/ Ministry/ }));
    fireEvent.click(screen.getByRole('option', { name: /Citizen/ }));

    expect(await screen.findByText('login screen')).toBeInTheDocument();
    expect(mockedAuth.logout).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the active persona is clicked again — no sign-out', () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: /Role: MoSPI \/ Ministry/ }));
    fireEvent.click(screen.getByRole('option', { name: /MoSPI \/ Ministry/ }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(mockedAuth.logout).not.toHaveBeenCalled();
  });
});
