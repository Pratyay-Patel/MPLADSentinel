import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import { SessionProvider } from '../auth';
import { LoginPage } from './LoginPage';

vi.mock('../api/auth');

const mockedAuth = vi.mocked(authApi);

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/dashboard', element: <p>dashboard screen</p> },
      { path: '/citizen', element: <p>citizen portal screen</p> },
      { path: '/', element: <p>home screen</p> },
    ],
    { initialEntries: ['/login'] },
  );
  return render(
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>,
  );
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('LoginPage', () => {
  it('renders the sign-in form', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    renderLogin();

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Username or email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
  });

  it('signs in and redirects an authority to the dashboard', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    mockedAuth.login.mockResolvedValue({
      username: 'mospi',
      role: 'MOSPI',
      displayName: 'MoSPI (demo)',
    });
    renderLogin();

    fireEvent.change(await screen.findByLabelText(/^Username or email/), { target: { value: 'mospi' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'Demo@12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('dashboard screen')).toBeInTheDocument();
    expect(mockedAuth.login).toHaveBeenCalledWith('mospi', 'Demo@12345');
  });

  it('redirects a citizen to the citizen portal', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    mockedAuth.login.mockResolvedValue({ username: 'citizen', role: 'CITIZEN', displayName: null });
    renderLogin();

    fireEvent.change(await screen.findByLabelText(/^Username or email/), { target: { value: 'citizen' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'Demo@12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('citizen portal screen')).toBeInTheDocument();
  });

  it('shows an error on bad credentials and stays on the form', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    mockedAuth.login.mockRejectedValue(new ApiError('bad', 401, null));
    renderLogin();

    fireEvent.change(await screen.findByLabelText(/^Username or email/), { target: { value: 'mospi' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  describe('Demo Accounts (Quick Login)', () => {
    it('shows all six seeded roles', async () => {
      mockedAuth.fetchCurrentUser.mockResolvedValue(null);
      renderLogin();

      await screen.findByText('Demo Accounts (Quick Login)');
      for (const label of [
        'MoSPI / Ministry',
        'State Authority',
        'District Authority',
        'Auditor',
        'Member of Parliament',
        'Citizen',
      ]) {
        expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
      }
    });

    it('signs in as the seeded account for the clicked role and redirects', async () => {
      mockedAuth.fetchCurrentUser.mockResolvedValue(null);
      mockedAuth.login.mockResolvedValue({
        username: 'district',
        role: 'DISTRICT',
        displayName: 'District Authority',
      });
      renderLogin();

      fireEvent.click(
        await screen.findByRole('button', { name: /District Authority/ }),
      );

      expect(await screen.findByText('dashboard screen')).toBeInTheDocument();
      expect(mockedAuth.login).toHaveBeenCalledWith('district', 'Demo@12345');
    });

    it('redirects a citizen quick-login to the citizen portal', async () => {
      mockedAuth.fetchCurrentUser.mockResolvedValue(null);
      mockedAuth.login.mockResolvedValue({ username: 'citizen', role: 'CITIZEN', displayName: null });
      renderLogin();

      fireEvent.click(await screen.findByRole('button', { name: /^Citizen/ }));

      expect(await screen.findByText('citizen portal screen')).toBeInTheDocument();
    });

    it('shows an error and re-enables the buttons when a quick login fails', async () => {
      mockedAuth.fetchCurrentUser.mockResolvedValue(null);
      mockedAuth.login.mockRejectedValue(new Error('network down'));
      renderLogin();

      fireEvent.click(await screen.findByRole('button', { name: /MoSPI \/ Ministry/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Could not sign in to that demo account.',
      );
      expect(screen.getByRole('button', { name: /District Authority/ })).toBeEnabled();
    });
  });
});
