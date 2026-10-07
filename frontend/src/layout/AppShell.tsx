import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { FilterProvider } from '../filters';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { RoleMismatchBanner } from './RoleMismatchBanner';

const SIDEBAR_ID = 'app-primary-nav';
const COLLAPSE_KEY = 'mplads.navCollapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Reusable application shell: sticky top header + left sidebar navigation +
 * scrollable content area (`<Outlet />`). Below 1024px the sidebar becomes an
 * off-canvas drawer toggled from the header; at desktop widths it can collapse
 * to an icon rail (persisted in localStorage).
 *
 * Structural only — no authorization, no role-specific rendering.
 */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const location = useLocation();

  const toggleCollapsed = () =>
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* private mode / storage disabled — keep it in memory only */
      }
      return next;
    });

  // On route change: close the mobile drawer and scroll the content back to top
  // (so a link / voice command doesn't land mid-page).
  useEffect(() => {
    setNavOpen(false);
    document.getElementById('app-main-content')?.scrollTo?.({ top: 0 });
    window.scrollTo?.({ top: 0 });
  }, [location.pathname, location.search]);

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
    <div className="app-shell" data-collapsed={collapsed || undefined}>
      <a href="#app-main-content" className="skip-link">
        Skip to main content
      </a>

      <AppHeader
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((open) => !open)}
        navId={SIDEBAR_ID}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />

      <AppSidebar
        id={SIDEBAR_ID}
        open={navOpen}
        collapsed={collapsed}
        onNavigate={() => setNavOpen(false)}
      />

      <div
        className="app-scrim"
        data-open={navOpen}
        aria-hidden
        onClick={() => setNavOpen(false)}
      />

      <main id="app-main-content" className="app-main" tabIndex={-1}>
        <div className="app-main__inner">
          <RoleMismatchBanner />
          <FilterProvider>
            <Outlet />
          </FilterProvider>
        </div>
      </main>
    </div>
  );
}
