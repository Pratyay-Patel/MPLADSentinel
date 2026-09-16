/**
 * Frontend auth + RBAC surface — session context (resolved from the backend,
 * decision D31), the role-to-area access map, and the route guards
 * `RequireAuth` / `RequireRole`. The access map decides what the UI shows;
 * backend authorization (Spring Security, D5) is the authoritative check.
 */

export { ROLES, ROLE_LABELS, isRole, type Role } from './roles';
export {
  AREA_ROLES,
  canAccess,
  reviewsGrievances,
  actionsGrievances,
  reviewsRecommendations,
  actionsRecommendations,
  assignsInspections,
  landingPathFor,
  type Area,
} from './access';
export {
  SessionContext,
  useSession,
  useCurrentRole,
  type Session,
  type SessionStatus,
} from './context';
export type { SessionUser } from '../api/auth';
export { SessionProvider } from './SessionProvider';
export { RequireRole } from './RequireRole';
export { RequireAuth } from './RequireAuth';
export { demoAuthEnabled, DEMO_PERSONAS, type DemoPersona } from './demoAuth';
