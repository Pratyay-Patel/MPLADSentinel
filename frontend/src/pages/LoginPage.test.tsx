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
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('signs in and redirects an authority to the dashboard', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    mockedAuth.login.mockResolvedValue({
      username: 'mospi',
      role: 'MOSPI',
      displayName: 'MoSPI (demo)',
    });
    renderLogin();

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'mospi' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Demo@12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('dashboard screen')).toBeInTheDocument();
    expect(mockedAuth.login).toHaveBeenCalledWith('mospi', 'Demo@12345');
  });

  it('redirects a citizen to the citizen portal', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    mockedAuth.login.mockResolvedValue({ username: 'citizen', role: 'CITIZEN', displayName: null });
    renderLogin();

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'citizen' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Demo@12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('citizen portal screen')).toBeInTheDocument();
  });

  it('shows an error on bad credentials and stays on the form', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    mockedAuth.login.mockRejectedValue(new ApiError('bad', 401, null));
    renderLogin();

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'mospi' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
