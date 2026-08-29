import { ROLES, type Role } from './roles';

/**
 * Access-controlled areas of the web portal. Each routed screen and each
 * navigation item is tagged with one `Area`; `canAccess` is the single place
 * that maps a role to what it may see.
 *
 * Client-side only — a convenience for navigation and page rendering. Backend
 * authorization (Spring Security, D5) remains the authoritative check.
 */
export type Area = 'overview' | 'projects' | 'risk' | 'audit' | 'citizen' | 'grievances';

const ALL_ROLES: Role[] = [...ROLES];
const AUTHORITIES: Role[] = ['MOSPI', 'STATE', 'DISTRICT', 'AUDITOR', 'MP'];

/** Roles allowed into each area. Keep in sync with docs/round1-scope.md P0.5. */
export const AREA_ROLES: Record<Area, Role[]> = {
  overview: AUTHORITIES,
  projects: ALL_ROLES,
  risk: AUTHORITIES,
  audit: AUTHORITIES,
  citizen: ALL_ROLES,
  grievances: ALL_ROLES,
};

export function canAccess(role: Role, area: Area): boolean {
  return AREA_ROLES[area].includes(role);
}

/** Roles that administer grievances — they can change a grievance's status. */
const GRIEVANCE_ADMINS: Role[] = ['MOSPI', 'STATE', 'DISTRICT'];

/**
 * True when the role sees the grievance **review queue** rather than the citizen
 * submission form. Everyone except a citizen reviews (docs/round1-scope.md P1.5).
 */
export function reviewsGrievances(role: Role): boolean {
  return role !== 'CITIZEN';
}

/** True when the role may advance a grievance's review status / add an action note. */
export function actionsGrievances(role: Role): boolean {
  return GRIEVANCE_ADMINS.includes(role);
}

/**
 * Where to send a user straight after sign-in when they had no specific
 * destination in mind. A citizen has no access to the government dashboard, so
 * they land on the citizen portal instead.
 */
export function landingPathFor(role: Role): string {
  return role === 'CITIZEN' ? '/citizen' : '/dashboard';
}
