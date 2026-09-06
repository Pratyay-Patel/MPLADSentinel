import { Navigate } from 'react-router-dom';

import { landingPathFor, useSession } from '../auth';

/**
 * The `/` route. An authenticated visitor is sent straight to their role's
 * landing screen (authorities → dashboard, citizens → the public portal); an
 * unauthenticated one falls through to `/login`. Rendered inside
 * {@link RequireAuth}, so `role` is normally set.
 */
export function IndexRedirect() {
  const { role } = useSession();
  return <Navigate to={role ? landingPathFor(role) : '/login'} replace />;
}
