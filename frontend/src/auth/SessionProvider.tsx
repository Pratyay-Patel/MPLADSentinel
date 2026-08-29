import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { SessionContext, type Session } from './context';
import { DEFAULT_ROLE, isRole, type Role } from './roles';

const STORAGE_KEY = 'mplads.portal.role';

function readStoredRole(): Role | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isRole(raw) ? raw : null;
  } catch {
    return null;
  }
}

function persistRole(role: Role): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // storage unavailable (private mode, disabled) — selection is session-only
  }
}

interface SessionProviderProps {
  children: ReactNode;
  /**
   * Starting role. Defaults to a persisted selection, then {@link DEFAULT_ROLE}.
   * Tests pass this to pin a role.
   */
  initialRole?: Role;
}

/**
 * Provides the active {@link Session} to the tree and persists the chosen role
 * to `localStorage` so a refresh keeps it. This stands in for backend sign-in
 * until Spring Security is wired up (D5); it performs no authentication.
 */
export function SessionProvider({ children, initialRole }: SessionProviderProps) {
  const [role, setRoleState] = useState<Role>(
    () => initialRole ?? readStoredRole() ?? DEFAULT_ROLE,
  );

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    persistRole(next);
  }, []);

  const value = useMemo<Session>(() => ({ role, setRole }), [role, setRole]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
