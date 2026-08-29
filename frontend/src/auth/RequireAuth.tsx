import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { LoadingState } from '../ui';
import { useSession } from './context';

interface RequireAuthProps {
  children: ReactElement;
}

/**
 * Gate for the whole authenticated shell. While the session is resolving it
 * shows a loading state; with no session it redirects to `/login`, remembering
 * the attempted location so login can send the user back.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div style={{ padding: 'var(--space-8, 2rem)' }}>
        <LoadingState label="Loading your session" />
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return children;
}
