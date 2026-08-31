import { Link } from 'react-router-dom';

import { landingPathFor } from '../auth/access';
import { ROLE_LABELS, type Role } from '../auth/roles';
import { AlertTriangleIcon } from './icons';

export interface ForbiddenStateProps {
  /** The current role, named in the message. */
  role: Role;
}

/**
 * Shown by {@link ../auth/RequireRole#RequireRole} when the active role may not
 * enter a route. A UX affordance, not an enforcement boundary.
 */
export function ForbiddenState({ role }: ForbiddenStateProps) {
  return (
    <div className="ui-placeholder-block">
      <span className="ui-placeholder-block__icon" aria-hidden>
        <AlertTriangleIcon width={22} height={22} />
      </span>
      <p className="ui-placeholder-block__title">This area is not available for your role</p>
      <p className="ui-placeholder-block__desc">
        The <strong>{ROLE_LABELS[role]}</strong> role does not have access to this section. Return to
        a section available to you to continue.
      </p>
      <div>
        <Link className="ui-btn ui-btn--secondary ui-btn--sm" to={landingPathFor(role)}>
          {role === 'CITIZEN' ? 'Go to Citizen Portal' : 'Go to dashboard'}
        </Link>
      </div>
    </div>
  );
}
