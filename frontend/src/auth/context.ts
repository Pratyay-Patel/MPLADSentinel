import { createContext, useContext } from 'react';

import type { SessionUser } from '../api/auth';
import type { Role } from './roles';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface Session {
  /** `loading` until the initial `/api/auth/me` probe resolves. */
  status: SessionStatus;
  /** The signed-in user, or `null` when `status` is not `authenticated`. */
  user: SessionUser | null;
  /** Shorthand for `user?.role`; `null` when not authenticated. */
  role: Role | null;
  /** Sign in with credentials. Rejects (ApiError) on bad credentials. */
  login: (username: string, password: string) => Promise<void>;
  /** End the session. Always resolves; local state is cleared regardless. */
  logout: () => Promise<void>;
}

/**
 * Holds the active {@link Session}. Populated by
 * {@link ./SessionProvider#SessionProvider} from the backend auth endpoints
 * (decision D31); read via {@link useSession}. The role is an authenticated
 * fact, never a UI selection — authorization itself is Spring Security (D5).
 */
export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be used within a <SessionProvider>.');
  }
  return session;
}

/**
 * The current role, asserted non-null. For components that only ever render
 * inside the authenticated shell (route guards, sidebar, feature screens).
 */
export function useCurrentRole(): Role {
  const { role } = useSession();
  if (!role) {
    throw new Error('useCurrentRole was called outside an authenticated session.');
  }
  return role;
}
