/**
 * Primary navigation structure for the application shell.
 *
 * Each item is tagged with an {@link Area}; the sidebar hides items the current
 * role cannot access (see `src/auth/access.ts`). Role-based visibility here is a
 * UX convenience — backend authorization (D5) is the real check. Routes remain
 * placeholders until their feature phase.
 */

import type { Area } from '../auth';

export interface NavItem {
  label: string;
  to: string;
  /** Access area this route belongs to. */
  area: Area;
  /** Match the route exactly (used for the index route). */
  end?: boolean;
}

export interface NavGroup {
  /** Group caption, or null for an unlabelled group. */
  caption: string | null;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    caption: 'Monitoring',
    items: [
      { label: 'Overview', to: '/dashboard', area: 'overview' },
      { label: 'Projects', to: '/projects', area: 'projects' },
      { label: 'Risk & Alerts', to: '/risk', area: 'risk' },
      { label: 'Compare MPs', to: '/compare', area: 'compare' },
      { label: 'Audit', to: '/audit', area: 'audit' },
    ],
  },
  {
    caption: 'Public',
    items: [
      { label: 'Citizen Portal', to: '/citizen', area: 'citizen' },
      { label: 'Grievances', to: '/grievances', area: 'grievances' },
    ],
  },
];
