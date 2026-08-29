import type { ReactElement } from 'react';

import { Card, ForbiddenState } from '../ui';
import { canAccess, type Area } from './access';
import { useSession } from './context';

interface RequireRoleProps {
  area: Area;
  children: ReactElement;
}

/**
 * Route guard: renders `children` only if the current role may enter `area`,
 * otherwise a "no access" state. This is UX, not security — the backend still
 * authorizes every API call (D5).
 */
export function RequireRole({ area, children }: RequireRoleProps) {
  const { role } = useSession();
  if (canAccess(role, area)) {
    return children;
  }
  return (
    <Card>
      <ForbiddenState role={role} />
    </Card>
  );
}
