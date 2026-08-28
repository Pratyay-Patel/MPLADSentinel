import { NavLink, Outlet } from 'react-router-dom';

/**
 * Base application shell: header with primary navigation, routed content area,
 * and footer. Feature screens render into the <Outlet />. Kept intentionally
 * minimal for the Project Foundation phase — no role-specific UI yet.
 */
export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <strong>MPLADSentinel</strong>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        MPLADSentinel — SIH PS 26102 · Project foundation build
      </footer>
    </div>
  );
}
