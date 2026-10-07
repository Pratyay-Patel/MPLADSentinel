import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type SessionUser,
} from '../api/auth';
import { SessionContext, type RoleMismatch, type Session, type SessionStatus } from './context';
import { clearDemoSession, demoAuthEnabled, demoLogin, readDemoSession } from './demoAuth';
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

function initialState(initialRole?: Role): SessionState {
  if (initialRole) {
    return authenticatedAs(initialRole);
  }
  if (demoAuthEnabled()) {
    const user = readDemoSession();
    return user ? { status: 'authenticated', user } : ANONYMOUS;
  }
  return LOADING;
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
 *
 * When {@link demoAuthEnabled} is set (the Vercel demo build) there is no
 * backend: the session comes from a client-side persona choice instead, and
 * registration is disabled.
 */
export function SessionProvider({ children, initialRole }: SessionProviderProps) {
  const demo = demoAuthEnabled();
  const [state, setState] = useState<SessionState>(() => initialState(initialRole));
  const [roleMismatch, setRoleMismatch] = useState<RoleMismatch | null>(null);

  // Mirrors `state` for the resync effect below, which runs from event
  // listeners added once and must not read a stale closure of `state`.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (initialRole || demo) {
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
  }, [initialRole, demo]);

  // The backend session is one cookie shared by every tab of this browser, so
  // signing in as a different role in another tab silently replaces it here
  // too — the next request this tab makes is authenticated as that other
  // role, not the one still shown on screen. Re-checking `/api/auth/me`
  // whenever the tab regains focus catches that before it shows up as a
  // confusing "you do not have access" error, and lets the UI explain what
  // actually happened instead.
  useEffect(() => {
    if (initialRole || demo) {
      return;
    }
    const resync = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      const prevUser = stateRef.current.user;
      fetchCurrentUser()
        .then((user) => {
          const stillPrevUser = stateRef.current.user;
          const changed =
            (stillPrevUser?.username ?? null) !== (user?.username ?? null) ||
            (stillPrevUser?.role ?? null) !== (user?.role ?? null);
          if (!changed) {
            return;
          }
          setState(user ? { status: 'authenticated', user } : ANONYMOUS);
          // Only surface the notice when this tab actually believed it was
          // someone — an anonymous tab picking up a session from elsewhere
          // (e.g. the user just signed in in another tab first) is a normal
          // sign-in, not a surprise.
          if (prevUser) {
            setRoleMismatch({ previous: prevUser, current: user });
          }
        })
        .catch(() => {
          /* transient network issue — leave the current session as-is */
        });
    };
    window.addEventListener('focus', resync);
    document.addEventListener('visibilitychange', resync);
    return () => {
      window.removeEventListener('focus', resync);
      document.removeEventListener('visibilitychange', resync);
    };
  }, [initialRole, demo]);

  const login = useCallback(
    async (username: string, password: string) => {
      setRoleMismatch(null);
      if (demo) {
        setState({ status: 'authenticated', user: demoLogin(username) });
        return;
      }
      const user = await apiLogin(username, password);
      setState({ status: 'authenticated', user });
    },
    [demo],
  );

  const register = useCallback(
    async (displayName: string, email: string, password: string) => {
      if (demo) {
        throw new Error('Account creation is disabled in the demo.');
      }
      const user = await apiRegister(displayName, email, password);
      setState({ status: 'authenticated', user });
    },
    [demo],
  );

  const logout = useCallback(async () => {
    setRoleMismatch(null);
    if (demo) {
      clearDemoSession();
      setState(ANONYMOUS);
      return;
    }
    try {
      await apiLogout();
    } finally {
      setState(ANONYMOUS);
    }
  }, [demo]);

  const dismissRoleMismatch = useCallback(() => setRoleMismatch(null), []);

  const value = useMemo<Session>(
    () => ({
      status: state.status,
      user: state.user,
      role: state.user?.role ?? null,
      login,
      register,
      logout,
      roleMismatch,
      dismissRoleMismatch,
    }),
    [state, login, register, logout, roleMismatch, dismissRoleMismatch],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
