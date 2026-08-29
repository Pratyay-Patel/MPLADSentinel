import type {
  BackendHealth,
  DataSource,
  Grievance,
  GrievanceInput,
  PaymentInstallment,
  Project,
  ProjectRisk,
  ProjectSummary,
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

  /** Aggregate counts / sums over the project set. */
  getProjectSummary(signal?: AbortSignal): Promise<ProjectSummary>;

  /** Risk information for one project, or `null` if the project is unknown. */
  getProjectRisk(sourceWorkId: number, signal?: AbortSignal): Promise<ProjectRisk | null>;

  /**
   * Payment installments for one work. Empty unless the work's
   * `paymentDataState === 'FETCHED_PRESENT'`.
   */
  getProjectPayments(sourceWorkId: number, signal?: AbortSignal): Promise<PaymentInstallment[]>;

  /** All grievances known to the provider, newest first. */
  listGrievances(signal?: AbortSignal): Promise<Grievance[]>;

  /** Record a new grievance and return the stored record. */
  submitGrievance(input: GrievanceInput, signal?: AbortSignal): Promise<Grievance>;
}
