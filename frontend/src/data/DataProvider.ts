import type { PublicProject } from './publicProject';
import type {
  AppNotification,
  AssignmentInput,
  AssignmentPatch,
  AuditEvidence,
  BackendHealth,
  DataSource,
  FieldOfficer,
  Grievance,
  GrievanceInput,
  GrievanceStatusPatch,
  InspectionAssignment,
  PaymentInstallment,
  Project,
  ProjectRisk,
  ProjectSummary,
  SignOffConfirmInput,
  SignOffRequestInput,
  WorkRecommendation,
  WorkRecommendationInput,
  WorkRecommendationStatusPatch,
} from './types';

/**
 * The swappable data boundary for the whole frontend.
 *
 * Two implementations exist:
 *  - {@link ./demo/DemoDataProvider} — serves clearly-marked demo fixtures.
 *  - {@link ./api/ApiDataProvider}   — serves real data via the centralized API
 *    client (`src/api/client.ts`); methods without a backend endpoint yet reject
 *    with a `ProviderError` of kind `notImplemented`.
 *
 * Screens depend only on this interface (through the feature services and the
 * React context), so migrating a screen from demo to API is a configuration
 * change, not a rewrite.
 *
 * Every method rejects with a {@link ./errors#ProviderError} on failure. `get*`
 * lookups resolve to `null` when the entity does not exist (not an error).
 */
export interface DataProvider {
  /** Which concrete provider this is. */
  readonly source: DataSource;

  /** Backend connectivity check (`GET /api/health`). */
  getBackendHealth(signal?: AbortSignal): Promise<BackendHealth>;

  /** All known projects/works. */
  listProjects(signal?: AbortSignal): Promise<Project[]>;

  /** One project by its Empowered Indian source work id, or `null` if unknown. */
  getProject(sourceWorkId: number, signal?: AbortSignal): Promise<Project | null>;

  /**
   * Publicly releasable view of every work — the only project data a citizen
   * receives. In `api` mode this is a distinct, server-narrowed endpoint
   * (`GET /api/public/works`); citizens cannot reach {@link listProjects}.
   */
  listPublicProjects(signal?: AbortSignal): Promise<PublicProject[]>;

  /** One publicly releasable work view by source work id, or `null` if unknown. */
  getPublicProject(reference: number, signal?: AbortSignal): Promise<PublicProject | null>;

  /** Aggregate counts / sums over the project set. */
  getProjectSummary(signal?: AbortSignal): Promise<ProjectSummary>;

  /** Risk information for one project, or `null` if the project is unknown. */
  getProjectRisk(sourceWorkId: number, signal?: AbortSignal): Promise<ProjectRisk | null>;

  /**
   * Risk for every project, keyed by `sourceWorkId`. The list screens read this
   * once instead of calling {@link getProjectRisk} per work.
   */
  listProjectRisks(signal?: AbortSignal): Promise<Record<number, ProjectRisk>>;

  /**
   * Payment installments for one work. Empty unless the work's
   * `paymentDataState === 'FETCHED_PRESENT'`.
   */
  getProjectPayments(sourceWorkId: number, signal?: AbortSignal): Promise<PaymentInstallment[]>;

  /** All grievances known to the provider, newest first. */
  listGrievances(signal?: AbortSignal): Promise<Grievance[]>;

  /** Record a new grievance and return the stored record. */
  submitGrievance(input: GrievanceInput, signal?: AbortSignal): Promise<Grievance>;

  /** Advance a grievance's review status (authority action); returns the updated record. */
  updateGrievanceStatus(
    id: string,
    patch: GrievanceStatusPatch,
    signal?: AbortSignal,
  ): Promise<Grievance>;

  /** Field officers an authority can assign an inspection to. */
  listFieldOfficers(signal?: AbortSignal): Promise<FieldOfficer[]>;

  /** Every inspection assignment, newest first. */
  listAssignments(signal?: AbortSignal): Promise<InspectionAssignment[]>;

  /** Request an inspection of a work by a field officer; returns the stored record. */
  createAssignment(input: AssignmentInput, signal?: AbortSignal): Promise<InspectionAssignment>;

  /** Advance an assignment's status / edit it (authority action); returns the updated record.
   * `patch.status` may only be `IN_PROGRESS` — completing/cancelling goes through the
   * dual-authority sign-off methods below. */
  updateAssignment(
    id: string,
    patch: AssignmentPatch,
    signal?: AbortSignal,
  ): Promise<InspectionAssignment>;

  /**
   * Dual-authority sign-off, step 1: an authority requests completing or
   * cancelling an open assignment. Does not change the real status — a second,
   * different authority must call {@link confirmAssignmentSignOff}.
   */
  requestAssignmentSignOff(
    id: string,
    input: SignOffRequestInput,
    signal?: AbortSignal,
  ): Promise<InspectionAssignment>;

  /**
   * Dual-authority sign-off, step 2: a second, different authority confirms a
   * pending sign-off, finalising the real status. Rejects if the confirming
   * user is the one who made the request.
   */
  confirmAssignmentSignOff(
    id: string,
    input: SignOffConfirmInput,
    signal?: AbortSignal,
  ): Promise<InspectionAssignment>;

  /**
   * Field-evidence images for a work's Audit Trail. `limit` (the assignment's
   * `requiredPhotos`) caps how many of the account's latest uploads to return;
   * omit for the backend default. In `api` mode this is the backend's read-only
   * Pinata lookup; the demo provider returns an unconfigured empty result.
   */
  getAuditPhotos(
    sourceWorkId: number,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<AuditEvidence>;

  /** The signed-in user's active (non-cleared) notifications, newest first. */
  listNotifications(signal?: AbortSignal): Promise<AppNotification[]>;

  /** Marks one of the caller's own notifications read; returns the updated record. */
  markNotificationRead(id: string, signal?: AbortSignal): Promise<AppNotification>;

  /** Marks every active notification of the caller's read. */
  markAllNotificationsRead(signal?: AbortSignal): Promise<void>;

  /**
   * "Clear all" — hides every active notification from {@link listNotifications}.
   * The records are not deleted server-side, only dismissed.
   */
  clearAllNotifications(signal?: AbortSignal): Promise<void>;

  /**
   * An authority flags a work as needing attention. Always lands in the single
   * seeded District Authority account's notifications for now — there is no
   * per-district account yet (decision D31).
   */
  sendSlaNotice(sourceWorkId: number, signal?: AbortSignal): Promise<void>;

  /** All work recommendations known to the provider, newest first. */
  listWorkRecommendations(signal?: AbortSignal): Promise<WorkRecommendation[]>;

  /** Record a new work recommendation and return the stored record (with its tracking number). */
  submitWorkRecommendation(
    input: WorkRecommendationInput,
    signal?: AbortSignal,
  ): Promise<WorkRecommendation>;

  /** Advance a work recommendation's review status (authority action); returns the updated record. */
  updateWorkRecommendationStatus(
    id: string,
    patch: WorkRecommendationStatusPatch,
    signal?: AbortSignal,
  ): Promise<WorkRecommendation>;
}
