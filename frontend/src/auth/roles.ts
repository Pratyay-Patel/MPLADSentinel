/**
 * Round-1 web-portal roles.
 *
 * This list mirrors the backend RBAC roles (docs/requirements.md,
 * docs/decisions.md D5) minus Field Officer, which has no web interface in
 * Round 1 (D23 — it is served by the Flutter mobile app).
 *
 * Nothing here grants access on its own: the real check is Spring Security at
 * the API layer (decision D5 / D31). This map only decides what the UI shows to
 * the already-authenticated user.
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

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
