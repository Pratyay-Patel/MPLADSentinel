/**
 * Frontend RBAC scaffold — role context, role-to-area access map, and the
 * `RequireRole` route guard. Client-side only: it decides what the UI shows,
 * not what a user is allowed to do. Backend authorization (Spring Security, D5)
 * is the authoritative check.
 */

export { ROLES, ROLE_LABELS, DEFAULT_ROLE, isRole, type Role } from './roles';
export { AREA_ROLES, canAccess, reviewsGrievances, actionsGrievances, type Area } from './access';
export { SessionContext, useSession, type Session } from './context';
export { SessionProvider } from './SessionProvider';
export { RequireRole } from './RequireRole';
