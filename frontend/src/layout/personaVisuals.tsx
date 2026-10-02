import type { CSSProperties, ReactElement } from 'react';

import type { Role } from '../auth';
import {
  ClipboardListIcon,
  LayoutGridIcon,
  MapPinIcon,
  NetworkIcon,
  ShieldIcon,
  UsersIcon,
} from '../ui/icons';

/**
 * Shared per-persona icon/colour presentation, split out of
 * {@link ./PersonaSwitcher} so it can also be reused by the login page's
 * "Demo Accounts (Quick Login)" section — the two stay visually in sync.
 */
export const PERSONA_ICON: Record<Role, ReactElement> = {
  MOSPI: <LayoutGridIcon />,
  STATE: <NetworkIcon />,
  DISTRICT: <MapPinIcon />,
  AUDITOR: <ShieldIcon />,
  MP: <ClipboardListIcon />,
  CITIZEN: <UsersIcon />,
};

/** Per-persona accent, used for the menu's icons and the active row's label text. */
export const PERSONA_ACCENT: Record<Role, string> = {
  MOSPI: '#2563eb',
  STATE: '#7c3aed',
  DISTRICT: '#d97706',
  AUDITOR: '#0d9488',
  MP: '#db2777',
  CITIZEN: '#16a34a',
};

/** Brighter tints of the same accents, for a trigger that sits on the dark header bar. */
export const PERSONA_ACCENT_ON_DARK: Record<Role, string> = {
  MOSPI: '#7ab0ff',
  STATE: '#b794f6',
  DISTRICT: '#fbbf53',
  AUDITOR: '#4fd1c5',
  MP: '#f783ac',
  CITIZEN: '#6ee7a0',
};

export function accentStyle(color: string): CSSProperties {
  return { '--persona-accent': color } as CSSProperties;
}
