import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type SessionUser,
} from '../api/auth';
import { SessionContext, type Session, type SessionStatus } from './context';
import type { Role } from './roles';

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
}

const LOADING: SessionState = { status: 'loading', user: null };
const ANONYMOUS: SessionState = { status: 'anonymous', user: null };

function authenticatedAs(role: Role): SessionState {
  return {
    status: 'authenticated',
    user: { username: role.toLowerCase(), role, displayName: null },
  };
}

interface SessionProviderProps {
  children: ReactNode;
  /**
   * Test / Storybook shorthand: start already authenticated as this role and
   * skip the `/api/auth/me` probe. The real app never passes this — it resolves
   * the session from the backend.
   */
  initialRole?: Role;
}

/**
 * Resolves the session from the backend (decision D31): on mount it calls
 * `GET /api/auth/me`; the result is `authenticated` or `anonymous`. `login`
 * and `logout` update the session in place. This performs no authorization —
 * that is Spring Security (D5).
 */
export function SessionProvider({ children, initialRole }: SessionProviderProps) {
  const [state, setState] = useState<SessionState>(() =>
    initialRole ? authenticatedAs(initialRole) : LOADING,
  );

  useEffect(() => {
    if (initialRole) {
      return;
    }
    const controller = new AbortController();
    fetchCurrentUser(controller.signal)
      .then((user) => {
        setState(user ? { status: 'authenticated', user } : ANONYMOUS);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState(ANONYMOUS);
        }
      });
    return () => controller.abort();
  }, [initialRole]);

  const login = useCallback(async (username: string, password: string) => {
    const user = await apiLogin(username, password);
    setState({ status: 'authenticated', user });
  }, []);

  const register = useCallback(
    async (displayName: string, email: string, password: string) => {
      const user = await apiRegister(displayName, email, password);
      setState({ status: 'authenticated', user });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setState(ANONYMOUS);
    }
  }, []);

  const value = useMemo<Session>(
    () => ({
      status: state.status,
      user: state.user,
      role: state.user?.role ?? null,
      login,
      register,
      logout,
    }),
    [state, login, register, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
