import { useNavigate } from 'react-router-dom';

import { ROLE_LABELS, useSession } from '../auth';

/**
 * Header identity control: shows who is signed in and their role, and signs
 * out. Replaces the D30 "Viewing as" dropdown now that the role is an
 * authenticated fact (decision D31), not a UI selection.
 */
export function UserMenu() {
  const { user, logout } = useSession();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-user-menu">
      <span className="app-user-menu__identity">
        <span className="app-user-menu__name">{user.displayName ?? user.username}</span>
        <span className="app-header__role">{ROLE_LABELS[user.role]}</span>
      </span>
      <button type="button" className="app-user-menu__signout" onClick={handleSignOut}>
        Sign out
      </button>
    </div>
  );
}
