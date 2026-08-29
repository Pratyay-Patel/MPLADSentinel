import { Link } from 'react-router-dom';

import { CloseIcon, MenuIcon } from '../ui/icons';

export interface AppHeaderProps {
  /** Whether the mobile nav drawer is open. */
  navOpen: boolean;
  onToggleNav: () => void;
  /** id of the sidebar element the toggle controls. */
  navId: string;
}

export function AppHeader({ navOpen, onToggleNav, navId }: AppHeaderProps) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="app-menu-toggle"
        aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={navOpen}
        aria-controls={navId}
        onClick={onToggleNav}
      >
        {navOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <Link to="/" className="app-brand" style={{ color: 'inherit', textDecoration: 'none' }}>
        <span className="app-brand__name">MPLADSentinel</span>
        <span className="app-brand__tagline">MPLADS monitoring &amp; transparency</span>
      </Link>

      <div className="app-header__spacer" />

      {/* Static placeholder — real user / role / sign-in is added in the RBAC phase. */}
      <div className="app-header__user">
        <span className="app-header__role">Role: not signed in</span>
      </div>
    </header>
  );
}
