import type { SessionUser } from '../api/auth';
import { isRole, ROLE_LABELS, type Role } from './roles';

/**
 * Demo authentication mode.
 *
 * When `VITE_DEMO_AUTH=true` the frontend runs with **no backend**: the session
 * is chosen from a persona picker and held client-side (memory + `sessionStorage`).
 * This exists only for the Vercel demo build; the real backend auth path
 * (decision D31) is untouched and is what runs when the flag is absent.
 *
 * Citizen self-registration is disabled in this mode.
 */
export function demoAuthEnabled(): boolean {
  return import.meta.env.VITE_DEMO_AUTH === 'true';
}

export interface DemoPersona {
  role: Role;
  label: string;
  blurb: string;
}

/** The six personas offered on the demo sign-in screen, in presentation order. */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    role: 'MOSPI',
    label: ROLE_LABELS.MOSPI,
    blurb: 'National oversight — every state, all risk analytics and alerts.',
  },
  {
    role: 'STATE',
    label: ROLE_LABELS.STATE,
    blurb: 'State-level monitoring of works, fund utilisation and flagged cases.',
  },
  {
    role: 'DISTRICT',
    label: ROLE_LABELS.DISTRICT,
    blurb: 'District execution view — progress, payments and grievances.',
  },
  {
    role: 'AUDITOR',
    label: ROLE_LABELS.AUDITOR,
    blurb: 'Read-only investigation view across works and risk indicators.',
  },
  {
    role: 'MP',
    label: ROLE_LABELS.MP,
    blurb: 'Constituency works, utilisation and implementation status.',
  },
  {
    role: 'CITIZEN',
    label: ROLE_LABELS.CITIZEN,
    blurb: 'Public portal — browse works in your area and raise a grievance.',
  },
];

const STORAGE_KEY = 'mplads.demoSession';

function demoUser(role: Role): SessionUser {
  return { username: role.toLowerCase(), role, displayName: `${ROLE_LABELS[role]} (demo)` };
}

/** The persisted demo persona for this tab, or `null` if none / storage unavailable. */
export function readDemoSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { role?: unknown };
    return isRole(parsed.role) ? demoUser(parsed.role) : null;
  } catch {
    return null;
  }
}

/** Persist the chosen persona for this tab and return the resulting user. */
export function writeDemoSession(role: Role): SessionUser {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ role }));
  } catch {
    // Private mode / storage disabled — the session still lives in memory.
  }
  return demoUser(role);
}

/** Forget the persisted demo persona. */
export function clearDemoSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/** Resolve a persona choice (any casing) to a demo {@link SessionUser}. */
export function demoLogin(roleInput: string): SessionUser {
  const role = roleInput.toUpperCase();
  if (!isRole(role)) {
    throw new Error(`Unknown demo persona: ${roleInput}`);
  }
  return writeDemoSession(role);
}
