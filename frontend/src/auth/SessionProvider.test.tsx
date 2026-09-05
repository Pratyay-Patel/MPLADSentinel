import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../api/auth';
import { useSession } from './context';
import { SessionProvider } from './SessionProvider';

vi.mock('../api/auth');

const mockedAuth = vi.mocked(authApi);

function Probe() {
  const { status, role, user, login, register, logout } = useSession();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="name">{user?.username ?? 'none'}</span>
      <button type="button" onClick={() => void login('mospi', 'pw')}>
        sign in
      </button>
      <button type="button" onClick={() => void register('Jane', 'jane@example.com', 'goodpassword')}>
        register
      </button>
      <button type="button" onClick={() => void logout()}>
        sign out
      </button>
    </div>
  );
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('SessionProvider', () => {
  it('resolves to authenticated when /me returns a user', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue({
      username: 'mospi',
      role: 'MOSPI',
      displayName: 'MoSPI (demo)',
    });

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('role')).toHaveTextContent('MOSPI');
    expect(screen.getByTestId('name')).toHaveTextContent('mospi');
  });

  it('resolves to anonymous when /me returns null', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(screen.getByTestId('role')).toHaveTextContent('none');
  });

  it('resolves to anonymous when /me rejects', async () => {
    mockedAuth.fetchCurrentUser.mockRejectedValue(new Error('network'));

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
  });

  it('login switches the session to authenticated', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    mockedAuth.login.mockResolvedValue({ username: 'auditor', role: 'AUDITOR', displayName: null });

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));

    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('role')).toHaveTextContent('AUDITOR');
    expect(mockedAuth.login).toHaveBeenCalledWith('mospi', 'pw');
  });

  it('register signs the new citizen in', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    mockedAuth.register.mockResolvedValue({
      username: 'jane@example.com',
      role: 'CITIZEN',
      displayName: 'Jane',
    });

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));

    fireEvent.click(screen.getByRole('button', { name: 'register' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('role')).toHaveTextContent('CITIZEN');
    expect(mockedAuth.register).toHaveBeenCalledWith('Jane', 'jane@example.com', 'goodpassword');
  });

  it('logout returns the session to anonymous', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue({
      username: 'mp',
      role: 'MP',
      displayName: null,
    });
    mockedAuth.logout.mockResolvedValue(undefined);

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    fireEvent.click(screen.getByRole('button', { name: 'sign out' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(mockedAuth.logout).toHaveBeenCalled();
  });

  it('initialRole shorthand starts authenticated and skips the /me probe', () => {
    render(
      <SessionProvider initialRole="STATE">
        <Probe />
      </SessionProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('role')).toHaveTextContent('STATE');
    expect(mockedAuth.fetchCurrentUser).not.toHaveBeenCalled();
  });

  it('throws if useSession is used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/within a <SessionProvider>/);
    spy.mockRestore();
  });
});
