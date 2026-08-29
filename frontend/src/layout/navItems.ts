/**
 * Primary navigation structure for the application shell.
 *
 * This is a static structural list for Phase 3A-2. Role-based visibility /
 * ordering is applied in the RBAC + navigation phase; nothing here grants
 * access — routes are placeholders until their feature phase.
 */

export interface NavItem {
  label: string;
  to: string;
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
      { label: 'Overview', to: '/dashboard' },
      { label: 'Projects', to: '/projects' },
      { label: 'Risk & Alerts', to: '/risk' },
      { label: 'Audit', to: '/audit' },
    ],
  },
  {
    caption: 'Public',
    items: [
      { label: 'Citizen Portal', to: '/citizen' },
      { label: 'Grievances', to: '/grievances' },
    ],
  },
];
