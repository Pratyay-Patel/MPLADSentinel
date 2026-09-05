import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { Role } from './roles';
import { RequireRole } from './RequireRole';
import { SessionProvider } from './SessionProvider';

function renderGuard(role: Role) {
  return render(
    <MemoryRouter>
      <SessionProvider initialRole={role}>
        <RequireRole area="risk">
          <p>risk screen body</p>
        </RequireRole>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  it('renders the guarded content when the role has access', () => {
    renderGuard('AUDITOR');
    expect(screen.getByText('risk screen body')).toBeInTheDocument();
  });

  it('renders a no-access state when the role lacks access', () => {
    renderGuard('CITIZEN');
    expect(screen.queryByText('risk screen body')).not.toBeInTheDocument();
    expect(screen.getByText(/not available for your role/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to citizen portal/i })).toHaveAttribute(
      'href',
      '/citizen',
    );
  });
});
