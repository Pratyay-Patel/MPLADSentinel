import { NavLink } from 'react-router-dom';

import { canAccess, useCurrentRole } from '../auth';
import { NAV_GROUPS } from './navItems';

export interface AppSidebarProps {
  /** Drawer open state (mobile only). */
  open: boolean;
  /** Desktop icon-rail mode (ignored below 1024px). */
  collapsed: boolean;
  /** Called when a nav link is activated, so the drawer can close. */
  onNavigate: () => void;
  /** id referenced by the header toggle's `aria-controls`. */
  id: string;
}

export function AppSidebar({ open, collapsed, onNavigate, id }: AppSidebarProps) {
  const role = useCurrentRole();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(role, item.area)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      id={id}
      className="app-sidebar"
      data-open={open}
      data-collapsed={collapsed || undefined}
      aria-label="Section navigation"
    >
      {groups.map((group) => (
        <nav
          key={group.caption ?? 'main'}
          className="app-nav"
          aria-label={group.caption ?? 'Navigation'}
        >
          {group.caption ? <p className="app-nav__caption">{group.caption}</p> : null}
          <ul>
            {group.items.map((item) => {
              const label = item.labelFor?.(role) ?? item.label;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className="app-nav__link"
                    title={collapsed ? label : undefined}
                    onClick={onNavigate}
                  >
                    <span className="app-nav__icon" aria-hidden>
                      {item.icon}
                    </span>
                    <span className="app-nav__label">{label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      ))}
    </aside>
  );
}
