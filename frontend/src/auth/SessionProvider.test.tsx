import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSession } from './context';
import { SessionProvider } from './SessionProvider';

const STORAGE_KEY = 'mplads.portal.role';

function Probe() {
  const { role, setRole } = useSession();
  return (
    <div>
      <span data-testid="role">{role}</span>
      <button type="button" onClick={() => setRole('CITIZEN')}>
        become citizen
      </button>
    </div>
  );
}

describe('SessionProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to MoSPI when nothing is stored', () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    expect(screen.getByTestId('role')).toHaveTextContent('MOSPI');
  });

  it('honours an explicit initialRole', () => {
    render(
      <SessionProvider initialRole="AUDITOR">
        <Probe />
      </SessionProvider>,
    );
    expect(screen.getByTestId('role')).toHaveTextContent('AUDITOR');
  });

  it('reads a previously persisted role', () => {
    window.localStorage.setItem(STORAGE_KEY, 'MP');
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    expect(screen.getByTestId('role')).toHaveTextContent('MP');
  });

  it('ignores an invalid stored value', () => {
    window.localStorage.setItem(STORAGE_KEY, 'PRESIDENT');
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    expect(screen.getByTestId('role')).toHaveTextContent('MOSPI');
  });

  it('persists a role change to localStorage', () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'become citizen' }));
    expect(screen.getByTestId('role')).toHaveTextContent('CITIZEN');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('CITIZEN');
  });

  it('throws if useSession is used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/within a <SessionProvider>/);
    spy.mockRestore();
  });
});
