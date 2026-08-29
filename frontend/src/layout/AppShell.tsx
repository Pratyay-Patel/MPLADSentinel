import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

const SIDEBAR_ID = 'app-primary-nav';

/**
 * Reusable application shell: sticky top header + left sidebar navigation +
 * scrollable content area (`<Outlet />`). Below 1024px the sidebar becomes an
 * off-canvas drawer toggled from the header.
 *
 * Structural only — no authorization, no role-specific rendering.
 */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  return (
    <div className="app-shell">
      <a href="#app-main-content" className="skip-link">
        Skip to main content
      </a>

      <AppHeader
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((open) => !open)}
        navId={SIDEBAR_ID}
      />

      <AppSidebar id={SIDEBAR_ID} open={navOpen} onNavigate={() => setNavOpen(false)} />

      <div
        className="app-scrim"
        data-open={navOpen}
        aria-hidden
        onClick={() => setNavOpen(false)}
      />

      <main id="app-main-content" className="app-main" tabIndex={-1}>
        <div className="app-main__inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
