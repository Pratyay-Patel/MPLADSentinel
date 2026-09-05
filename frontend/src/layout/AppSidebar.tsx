import { NavLink } from 'react-router-dom';

import { canAccess, useCurrentRole } from '../auth';
import { NAV_GROUPS } from './navItems';

export interface AppSidebarProps {
  /** Drawer open state (mobile only). */
  open: boolean;
  /** Called when a nav link is activated, so the drawer can close. */
  onNavigate: () => void;
  /** id referenced by the header toggle's `aria-controls`. */
  id: string;
}

export function AppSidebar({ open, onNavigate, id }: AppSidebarProps) {
  const role = useCurrentRole();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(role, item.area)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside id={id} className="app-sidebar" data-open={open} aria-label="Section navigation">
      {groups.map((group) => (
        <nav
          key={group.caption ?? 'main'}
          className="app-nav"
          aria-label={group.caption ?? 'Navigation'}
        >
          {group.caption ? <p className="app-nav__caption">{group.caption}</p> : null}
          <ul>
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className="app-nav__link" onClick={onNavigate}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </aside>
  );
}
