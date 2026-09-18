import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import { SessionProvider } from '../auth';
import { RegisterPage } from './RegisterPage';

vi.mock('../api/auth');

const mockedAuth = vi.mocked(authApi);

function renderRegister() {
  const router = createMemoryRouter(
    [
      { path: '/register', element: <RegisterPage /> },
      { path: '/login', element: <p>login screen</p> },
      { path: '/citizen', element: <p>citizen portal screen</p> },
    ],
    { initialEntries: ['/register'] },
  );
  return render(
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/^Your name/), { target: { value: 'Jane Citizen' } });
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'jane@example.com' } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'goodpassword' } });
  fireEvent.change(screen.getByLabelText(/^Confirm password/), { target: { value: 'goodpassword' } });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('RegisterPage', () => {
  it('renders the citizen registration form', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    renderRegister();

    expect(await screen.findByRole('button', { name: 'Create account' })).toBeInTheDocument();
    for (const label of [/^Your name/, /^Email/, /^Password/, /^Confirm password/]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('registers a citizen and redirects to the citizen portal', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    mockedAuth.register.mockResolvedValue({
      username: 'jane@example.com',
      role: 'CITIZEN',
      displayName: 'Jane Citizen',
    });
    renderRegister();
    await screen.findByRole('button', { name: 'Create account' });

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('citizen portal screen')).toBeInTheDocument();
    expect(mockedAuth.register).toHaveBeenCalledWith('Jane Citizen', 'jane@example.com', 'goodpassword');
  });

  it('validates the form client-side before calling the API', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    renderRegister();
    await screen.findByRole('button', { name: 'Create account' });

    // mismatched passwords
    fireEvent.change(screen.getByLabelText(/^Your name/), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'goodpassword' } });
    fireEvent.change(screen.getByLabelText(/^Confirm password/), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('passwords do not match');
    expect(mockedAuth.register).not.toHaveBeenCalled();
  });

  it('shows a helpful error when the email is already registered', async () => {
    mockedAuth.fetchCurrentUser.mockResolvedValue(null);
    mockedAuth.register.mockRejectedValue(new ApiError('conflict', 409, null));
    renderRegister();
    await screen.findByRole('button', { name: 'Create account' });

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already registered');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });
});
