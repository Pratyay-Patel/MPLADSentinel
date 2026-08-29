import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../api/auth';
import { SessionProvider, type Role } from '../auth';
import { UserMenu } from './UserMenu';

vi.mock('../api/auth');

function renderMenu(role: Role) {
  return render(
    <MemoryRouter>
      <SessionProvider initialRole={role}>
        <UserMenu />
      </SessionProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('UserMenu', () => {
  it('shows the signed-in identity and role label', () => {
    renderMenu('AUDITOR');
    expect(screen.getByText('auditor')).toBeInTheDocument();
    expect(screen.getByText('Auditor')).toBeInTheDocument();
  });

  it('signs out via the auth API', async () => {
    vi.mocked(authApi).logout.mockResolvedValue(undefined);
    renderMenu('MOSPI');

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(vi.mocked(authApi).logout).toHaveBeenCalledTimes(1));
  });
});
