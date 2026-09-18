/**
 * Primary navigation structure for the application shell.
 *
 * Each item is tagged with an {@link Area}; the sidebar hides items the current
 * role cannot access (see `src/auth/access.ts`). Role-based visibility here is a
 * UX convenience — backend authorization (D5) is the real check. The icon is
 * used for the collapsed (icon-rail) sidebar.
 */

import type { ReactNode } from 'react';

import { reviewsRecommendations, type Area, type Role } from '../auth';
import {
  AlertTriangleIcon,
  BarsIcon,
  ChatIcon,
  ClipboardListIcon,
  CopyIcon,
  InboxIcon,
  LayoutGridIcon,
  ListIcon,
  NetworkIcon,
  RupeeIcon,
  SendIcon,
  ShieldIcon,
  TrendingUpIcon,
  UsersIcon,
} from '../ui/icons';

export interface NavItem {
  label: string;
  to: string;
  /** Access area this route belongs to. */
  area: Area;
  /** Match the route exactly (used for the index route). */
  end?: boolean;
  /** Shown in the collapsed sidebar rail. */
  icon: ReactNode;
  /** Overrides `label` for a given role, when the same screen reads differently
   *  depending on who's looking (e.g. a citizen "recommends"; an authority
   *  "reviews recommendations"). Falls back to `label` when omitted. */
  labelFor?: (role: Role) => string;
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
      { label: 'Overview', to: '/dashboard', area: 'overview', icon: <LayoutGridIcon /> },
      { label: 'Projects', to: '/projects', area: 'projects', icon: <ListIcon /> },
      { label: 'Risk & Alerts', to: '/risk', area: 'risk', icon: <AlertTriangleIcon /> },
      {
        label: 'Duplicate Works',
        to: '/duplicates',
        area: 'duplicates',
        icon: <CopyIcon />,
      },
      {
        label: 'Cartel & Cluster Matrix',
        to: '/cartel',
        area: 'cartel',
        icon: <NetworkIcon />,
      },
      { label: 'Compare MPs', to: '/compare', area: 'compare', icon: <BarsIcon /> },
      { label: 'Inspections', to: '/inspections', area: 'inspections', icon: <ClipboardListIcon /> },
      {
        label: 'Escrow & Fund Control',
        to: '/escrow',
        area: 'escrow',
        icon: <RupeeIcon />,
      },
      { label: 'Audit', to: '/audit', area: 'audit', icon: <ShieldIcon /> },
    ],
  },
  {
    caption: 'Intelligence',
    items: [
      { label: 'Analytics', to: '/analytics', area: 'analytics', icon: <TrendingUpIcon /> },
      { label: 'Assistant', to: '/assistant', area: 'assistant', icon: <ChatIcon /> },
    ],
  },
  {
    caption: 'Public',
    items: [
      { label: 'Citizen Portal', to: '/citizen', area: 'citizen', icon: <UsersIcon /> },
      {
        label: 'Transparency Overview',
        to: '/citizen/overview',
        area: 'citizen',
        icon: <LayoutGridIcon />,
      },
      {
        label: 'Compare MPs (Public)',
        to: '/citizen/compare',
        area: 'citizen',
        icon: <BarsIcon />,
      },
      {
        label: 'Recommend a Work',
        labelFor: (role) => (reviewsRecommendations(role) ? 'Recommended Works' : 'Recommend a Work'),
        to: '/recommend',
        area: 'recommendations',
        icon: <SendIcon />,
      },
      { label: 'Grievances', to: '/grievances', area: 'grievances', icon: <InboxIcon /> },
    ],
  },
];
