/**
 * Round-1 web-portal roles.
 *
 * This list mirrors the backend RBAC roles (docs/requirements.md,
 * docs/decisions.md D5) minus Field Officer, which has no web interface in
 * Round 1 (D23 — it is served by the Flutter mobile app).
 *
 * Nothing here grants access on its own: the real check is Spring Security at
 * the API layer. This scaffold only decides what the current UI shows.
 */

export const ROLES = ['MOSPI', 'STATE', 'DISTRICT', 'AUDITOR', 'MP', 'CITIZEN'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  MOSPI: 'MoSPI / Ministry',
  STATE: 'State Authority',
  DISTRICT: 'District Authority',
  AUDITOR: 'Auditor',
  MP: 'Member of Parliament',
  CITIZEN: 'Citizen',
};

/** Role assumed before any explicit selection. */
export const DEFAULT_ROLE: Role = 'MOSPI';

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
