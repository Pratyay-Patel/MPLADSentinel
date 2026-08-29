import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { SessionProvider } from '../auth';
import { RoleSwitcher } from './RoleSwitcher';

const STORAGE_KEY = 'mplads.portal.role';

function renderSwitcher() {
  return render(
    <SessionProvider>
      <RoleSwitcher />
    </SessionProvider>,
  );
}

describe('RoleSwitcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the current role and every selectable role', () => {
    renderSwitcher();
    const select = screen.getByLabelText('Viewing as');
    expect(select).toHaveValue('MOSPI');
    expect(screen.getByRole('option', { name: 'Citizen' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Auditor' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Member of Parliament' })).toBeInTheDocument();
  });

  it('changes and persists the active role on selection', () => {
    renderSwitcher();
    fireEvent.change(screen.getByLabelText('Viewing as'), { target: { value: 'CITIZEN' } });
    expect(screen.getByLabelText('Viewing as')).toHaveValue('CITIZEN');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('CITIZEN');
  });
});
