import { useId } from 'react';

import { ROLE_LABELS, ROLES, useSession, type Role } from '../auth';

/**
 * Header control for choosing the active role. Stands in for backend sign-in
 * until Spring Security exists (D5) — it selects a viewing context, it does not
 * authenticate. The chosen role is persisted by {@link ../auth/SessionProvider}.
 */
export function RoleSwitcher() {
  const { role, setRole } = useSession();
  const id = useId();

  return (
    <div className="app-role-switcher">
      <label className="app-role-switcher__label" htmlFor={id}>
        Viewing as
      </label>
      <select
        id={id}
        className="app-role-switcher__select"
        value={role}
        onChange={(event) => setRole(event.target.value as Role)}
      >
        {ROLES.map((value) => (
          <option key={value} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </select>
    </div>
  );
}
