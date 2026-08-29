import { createContext, useContext } from 'react';

import type { Role } from './roles';

export interface Session {
  /** The role the portal is currently rendering for. */
  role: Role;
  /** Switch the active role (persisted by the provider). */
  setRole: (role: Role) => void;
}

/**
 * Holds the active {@link Session}. Populated by
 * {@link ./SessionProvider#SessionProvider}; read via {@link useSession}.
 *
 * Until backend sign-in exists, the role is chosen in the UI. It is a view
 * concern only — never an authorization decision.
 */
export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be used within a <SessionProvider>.');
  }
  return session;
}
