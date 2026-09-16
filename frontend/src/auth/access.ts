import { ROLES, type Role } from './roles';

/**
 * Access-controlled areas of the web portal. Each routed screen and each
 * navigation item is tagged with one `Area`; `canAccess` is the single place
 * that maps a role to what it may see.
 *
 * Client-side only — a convenience for navigation and page rendering. Backend
 * authorization (Spring Security, D5) remains the authoritative check.
 */
export type Area =
  | 'overview'
  | 'projects'
  | 'risk'
  | 'duplicates'
  | 'compare'
  | 'analytics'
  | 'assistant'
  | 'inspections'
  | 'audit'
  | 'citizen'
  | 'grievances'
  | 'recommendations'
  | 'escrow';

const ALL_ROLES: Role[] = [...ROLES];
const AUTHORITIES: Role[] = ['MOSPI', 'STATE', 'DISTRICT', 'AUDITOR', 'MP'];

/**
 * Escrow & Fund Control involves exactly these two roles (District Officer
 * requests, MoSPI reviews / sends the release notice) — no other authority
 * role has a part in this feature.
 */
const FUND_CONTROL_ROLES: Role[] = ['DISTRICT', 'MOSPI'];

/** Roles allowed into each area. Keep in sync with docs/round1-scope.md P0.5. */
export const AREA_ROLES: Record<Area, Role[]> = {
  overview: AUTHORITIES,
  projects: AUTHORITIES,
  risk: AUTHORITIES,
  duplicates: AUTHORITIES,
  compare: AUTHORITIES,
  analytics: AUTHORITIES,
  assistant: AUTHORITIES,
  inspections: AUTHORITIES,
  audit: AUTHORITIES,
  citizen: ALL_ROLES,
  grievances: ALL_ROLES,
  recommendations: ALL_ROLES,
  escrow: FUND_CONTROL_ROLES,
};

export function canAccess(role: Role, area: Area): boolean {
  return AREA_ROLES[area].includes(role);
}

/**
 * Roles that administer citizen-submitted records (grievances, work
 * recommendations) — they can change a record's review status. Same subset
 * that assigns inspections.
 */
const CORE_AUTHORITIES: Role[] = ['MOSPI', 'STATE', 'DISTRICT'];

/**
 * True when the role sees the grievance **review queue** rather than the citizen
 * submission form. Everyone except a citizen reviews (docs/round1-scope.md P1.5).
 */
export function reviewsGrievances(role: Role): boolean {
  return role !== 'CITIZEN';
}

/** True when the role may advance a grievance's review status / add an action note. */
export function actionsGrievances(role: Role): boolean {
  return CORE_AUTHORITIES.includes(role);
}

/**
 * True when the role sees the work-recommendation **review queue** rather than
 * the citizen submission form. Everyone except a citizen reviews (mirrors
 * grievances).
 */
export function reviewsRecommendations(role: Role): boolean {
  return role !== 'CITIZEN';
}

/** True when the role may advance a work recommendation's review status. */
export function actionsRecommendations(role: Role): boolean {
  return CORE_AUTHORITIES.includes(role);
}

/**
 * True when the role may request an inspection and advance an assignment's
 * status — MoSPI / State / District (same subset that administers grievances).
 * Auditor / MP see the Inspections screen read-only.
 */
export function assignsInspections(role: Role): boolean {
  return CORE_AUTHORITIES.includes(role);
}

/**
 * Where to send a user straight after sign-in when they had no specific
 * destination in mind. A citizen has no access to the government dashboard, so
 * they land on the citizen portal instead.
 */
export function landingPathFor(role: Role): string {
  return role === 'CITIZEN' ? '/citizen' : '/dashboard';
}
