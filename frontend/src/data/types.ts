/**
 * Typed domain models for the data-provider layer.
 *
 * These are the shapes React screens consume. They mirror the backend model that
 * actually exists today — the Phase 2C `Work` / `WorkPayment` entities and the
 * Phase 2E-1 normalisation output (see `docs/data-source.md`, `backend/.../domain`).
 * No field here is invented: where the backend does not (yet) expose something,
 * it is simply absent. Transport DTOs (raw API JSON) are mapped into these by the
 * ApiDataProvider; the UI never sees a raw DTO.
 */

/** Which concrete provider is serving data — surfaced for diagnostics / a dev badge. */
export type DataSource = 'demo' | 'api';

/** Endpoint(s) a work has been observed in. Matches backend `LifecycleState`. */
export type LifecycleState = 'RECOMMENDED' | 'COMPLETED' | 'RECOMMENDED_AND_COMPLETED';

/**
 * Whether work-level payment information has been retrieved, and the outcome.
 * Matches backend `PaymentDataState`. `FETCHED_ABSENT` means "no payment rows
 * found" — it is NOT "&#8377;0 spent".
 */
export type PaymentDataState = 'NOT_FETCHED' | 'FETCHED_PRESENT' | 'FETCHED_ABSENT' | 'FETCH_ERROR';

/** House of Parliament. Present only for works seen in the recommended endpoint. */
export type ProjectHouse = 'LOK_SABHA' | 'RAJYA_SABHA';

/** A monetary amount with its currency (backend `Work.currency`, currently always INR). */
export interface Money {
  amount: number;
  currency: string;
}

/**
 * One MPLADS work ("project"), assembled from the Empowered Indian recommended
 * and/or completed listings.
 *
 * `sourceWorkId` is the secondary source's numeric identifier. Its relationship
 * to an official MPLADS / e-SAKSHI id is unknown — it must never be presented as
 * an official work id.
 */
export interface Project {
  sourceName: string;
  sourceWorkId: number;

  workDescription: string | null;
  category: string | null;
  house: ProjectHouse | null;
  lsTerm: number | null;

  mpName: string | null;
  constituency: string | null;
  state: string | null;
  district: string | null;
  locationRaw: string | null;

  /** From the recommended endpoint (`estimated_cost`). Never merged with `finalCost`. */
  estimatedCost: Money | null;
  /** From the completed endpoint (`cost`). Never merged with `estimatedCost`. */
  finalCost: Money | null;

  /** ISO date (day precision), or null. */
  recommendedOn: string | null;
  recommendedYear: number | null;
  completedOn: string | null;
  completionYear: number | null;

  sourceStatusRaw: string | null;
  expectedBeneficiaries: number | null;

  seenInRecommended: boolean;
  seenInCompleted: boolean;
  lifecycleState: LifecycleState;

  paymentDataState: PaymentDataState;
  /** Total recorded via the payments endpoint; null unless `paymentDataState === 'FETCHED_PRESENT'`. */
  recordedPayments: Money | null;
  paymentInstallments: number | null;

  /** Descriptive source-data-quality markers (backend `data_quality_flags`). Not risk findings. */
  dataQualityFlags: string[];
}

/**
 * One payment installment for a work, from the work-level payments endpoint
 * (backend `WorkPayment`). Only meaningful when the owning project's
 * `paymentDataState === 'FETCHED_PRESENT'`.
 */
export interface PaymentInstallment {
  /** Position within the source's payment list (0-based). */
  ordinal: number;
  amount: Money;
  /** ISO date (day precision), or null. */
  paidOn: string | null;
  vendorName: string | null;
  /** Raw source status string (only `"Payment Success"` has been observed). */
  statusRaw: string | null;
  /** Implementing authority free text (`ida`); the source has no structured field. */
  implementingAuthorityText: string | null;
}

/**
 * Aggregate counts / sums over the project set. Every field is a straightforward
 * roll-up of the `Project` fields above — nothing here needs a backend field that
 * does not exist.
 */
export interface ProjectSummary {
  totalProjects: number;
  byLifecycleState: Record<LifecycleState, number>;
  byPaymentDataState: Record<PaymentDataState, number>;
  totalEstimatedCost: Money;
  totalRecordedPayments: Money;
}

/** Risk banding for a project. `UNKNOWN` = not assessed. */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

/**
 * Risk information for a project.
 *
 * NOTE: there is no backend risk engine yet (Round-1 P0.4 / requirements F3, F10
 * are a later phase; the backend's `data_quality_flags` are descriptive, not a
 * risk score). This type is the stable shape those future screens and the future
 * risk API will use. The DemoDataProvider returns clearly-marked illustrative
 * values; the ApiDataProvider leaves this method unimplemented until the risk
 * API exists.
 */
export interface ProjectRisk {
  sourceWorkId: number;
  level: RiskLevel;
  /** 0–100, or null when not assessed. */
  score: number | null;
  /** Human-readable contributing factors (requirements F10). */
  reasons: string[];
  /** ISO timestamp of the assessment, or null when not assessed. */
  assessedAt: string | null;
}

/** Confidence banding for a {@link DuplicatePair} match. Mirrors backend `DuplicateConfidence`. */
export type DuplicateConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * A lightweight view of one side of a {@link DuplicatePair} — enough to
 * display without a second fetch per work.
 *
 * `estimatedCost` here is a plain rupee amount (not {@link Money}) because
 * that's what `GET /api/works/duplicates` actually returns — the backend
 * `WorkSummary` record serialises `estimatedCost` as a bare number, unlike
 * `Project.estimatedCost`, which the works DTOs wrap with a currency.
 */
export interface DuplicateWorkSummary {
  sourceWorkId: number;
  workDescription: string | null;
  state: string | null;
  district: string | null;
  category: string | null;
  estimatedCost: number | null;
}

/**
 * A candidate duplicate: two ingested works in the same state, district and
 * category whose description text and/or estimated cost look like the same
 * physical work listed or sanctioned more than once (requirements F7,
 * decision D35). Rule-based and deterministic, same style as
 * {@link ProjectRisk} (decision D22) — an investigation indicator, never
 * proof that two records are actually the same work.
 */
export interface DuplicatePair {
  workA: DuplicateWorkSummary;
  workB: DuplicateWorkSummary;
  /** 0–100, capped. */
  score: number;
  confidence: DuplicateConfidence;
  /** Human-readable contributing signals — never empty. */
  reasons: string[];
}

/**
 * `GET /api/works/duplicates` response shape. Across the full ingested
 * dataset the engine can surface tens of thousands of candidate pairs, so the
 * backend returns only the highest-scoring ones — `totalFound` is the true
 * count before that cap, so the UI can say "top N of total" honestly instead
 * of silently truncating.
 */
export interface DuplicatePairsResult {
  pairs: DuplicatePair[];
  totalFound: number;
}

/** Minimal backend connectivity signal, mapped from `GET /api/health`. */
export interface BackendHealth {
  status: string;
  service: string;
}

/** Review lifecycle of a grievance. Authorities advance it through these states. */
export type GrievanceStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACTIONED' | 'CLOSED';

/** What a citizen fills in on the grievance form. */
export interface GrievanceInput {
  /** `sourceWorkId` of the work this grievance is about, or null if general. */
  workReference: number | null;
  category: string;
  subject: string;
  description: string;
  contactName: string | null;
  contactEmail: string | null;
}

/** A grievance record. `id` / `submittedAt` / `status` are assigned on submit. */
export interface Grievance extends GrievanceInput {
  id: string;
  /** ISO timestamp of submission. */
  submittedAt: string;
  status: GrievanceStatus;
  /** Authority note recorded with the most recent status change, or null. */
  actionNote: string | null;
  /** ISO timestamp of the last status/note change (= `submittedAt` until acted on). */
  updatedAt: string;
}

/** Fields an authority can change when reviewing a grievance. */
export interface GrievanceStatusPatch {
  status: GrievanceStatus;
  actionNote?: string | null;
}

/** Review lifecycle of a citizen work recommendation. Authorities advance it through these states. */
export type RecommendationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'RECOMMENDED' | 'REJECTED';

/** Whether the proposed site is rural or urban. */
export type LocationCategory = 'RURAL' | 'URBAN';

/** What a citizen fills in on the "recommend a work" form (e-SAKSHI-style). */
export interface WorkRecommendationInput {
  fullName: string;
  mobileNumber: string;
  email: string | null;
  state: string;
  mpName: string;
  constituency: string;
  locationCategory: LocationCategory;
  /** A maps link or lat,lng pair for the proposed site, in place of free-text locality. */
  gpsCoordinatesLink: string;
  workTitle: string;
  category: string;
  description: string;
}

/** A work recommendation record. `id` / `trackingNumber` / `submittedAt` / `status` are assigned on submit. */
export interface WorkRecommendation extends WorkRecommendationInput {
  id: string;
  /** Citizen-facing acknowledgement code, e.g. `CIT-2026-000042`. */
  trackingNumber: string;
  /** ISO timestamp of submission. */
  submittedAt: string;
  status: RecommendationStatus;
  /** Authority note recorded with the most recent status change, or null. */
  actionNote: string | null;
  /** ISO timestamp of the last status/note change (= `submittedAt` until acted on). */
  updatedAt: string;
}

/** Fields an authority can change when reviewing a work recommendation. */
export interface WorkRecommendationStatusPatch {
  status: RecommendationStatus;
  actionNote?: string | null;
}

/**
 * Lifecycle of an inspection assignment (backend `AssignmentStatus`).
 * `ASSIGNED → IN_PROGRESS → COMPLETED`, or `CANCELLED` from an open state.
 * The UI labels these "Requested / In progress / Completed / Cancelled".
 */
export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/** A field officer an authority can assign an inspection to (`GET /api/officers`). */
export interface FieldOfficer {
  /** Stable code used by the mobile app, e.g. `OFF102`. */
  officerCode: string;
  name: string;
  phone: string | null;
}

/** What an authority fills in to request an inspection. */
export interface AssignmentInput {
  sourceWorkId: number;
  officerCode: string;
  /** ISO date (day precision), or null. */
  dueDate: string | null;
  note: string | null;
  /** Field-evidence photos this inspection calls for (1–20). */
  requiredPhotos: number;
}

/**
 * An inspection assignment. `workTitle` / `officerName` / `assignedByName` are
 * joined in by the backend. The Audit Trail renders only the *date* portion of
 * `assignedAt` / `updatedAt`.
 */
export interface InspectionAssignment {
  id: string;
  sourceWorkId: number;
  workTitle: string;
  officerCode: string | null;
  officerName: string | null;
  assignedByName: string | null;
  status: AssignmentStatus;
  dueDate: string | null;
  note: string | null;
  /** Field-evidence photos this inspection calls for (1–20). */
  requiredPhotos: number;
  /** ISO timestamp. */
  assignedAt: string;
  /** ISO timestamp of the last status/detail change. */
  updatedAt: string;
  /** Target status (COMPLETED/CANCELLED) awaiting a second, different authority's
   * dual-sign-off confirmation. Null when nothing is pending. */
  pendingStatus: AssignmentStatus | null;
  /** The requesting authority's username — compare against the current session's
   * username to know whether "you" may confirm this (a different user must). */
  pendingRequestedByUsername: string | null;
  pendingRequestedByName: string | null;
  pendingJustification: string | null;
  /** ISO timestamp, or null when nothing is pending. */
  pendingRequestedAt: string | null;
}

/** Body of the first dual-authority sign-off request (completing or cancelling). */
export interface SignOffRequestInput {
  targetStatus: AssignmentStatus;
  justification: string;
}

/** Body of the second, different authority's sign-off confirmation. */
export interface SignOffConfirmInput {
  justification: string;
}

/** Fields an authority can change on an assignment. A non-null value is applied.
 * `status` may only be set to `IN_PROGRESS` here — completing/cancelling requires
 * dual-authority sign-off (see {@link SignOffRequestInput}). */
export interface AssignmentPatch {
  status?: AssignmentStatus;
  dueDate?: string | null;
  note?: string | null;
  requiredPhotos?: number;
}

/** One field-evidence image for the Audit Trail — an IPFS CID and a viewable gateway URL. */
export interface AuditPhoto {
  cid: string;
  name: string | null;
  url: string;
}

/**
 * Field-evidence images for a work's Audit Trail (`GET /api/audit/{id}/photos`).
 * `configured` is `false` when the backend has no Pinata credential set — the
 * page then shows a "not connected" note instead of an error.
 */
export interface AuditEvidence {
  photos: AuditPhoto[];
  configured: boolean;
}

/**
 * What generated a {@link AppNotification}: a real HIGH-risk work seeded from
 * the rule-based risk engine, or an authority's explicit "Send Notice" action.
 */
export type NotificationCategory = 'HIGH_RISK_WORK' | 'SLA_NOTICE';

/**
 * An in-app notification (the header bell). "Clearing" a notification hides it
 * from this list but does not delete it server-side — see {@link DataProvider}.
 */
export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  /** The work this notification is about, or null for a general one. */
  sourceWorkId: number | null;
  read: boolean;
  /** ISO timestamp. */
  createdAt: string;
}

/**
 * Escrow decision for a {@link FundRequest}. Mirrors backend
 * `FundRequestStatus`. Decided automatically at creation — there is no
 * `PENDING`/`UNDER_REVIEW` state and no manual approve/reject action.
 */
export type FundRequestStatus = 'APPROVED' | 'REJECTED';

/**
 * One entry in a fund request's permanent chronological history. Mirrors
 * backend `FundRequestEventType`; also the exact event list the feature spec
 * names as future blockchain-mappable events.
 */
export type FundRequestEventType = 'CREATED' | 'APPROVED' | 'REJECTED' | 'RELEASE_NOTICE_SENT';

export interface FundRequestEvent {
  eventType: FundRequestEventType;
  /** ISO timestamp. */
  occurredAt: string;
  /** Who caused this event, or null for the automatic decision events. */
  actorName: string | null;
  detail: string | null;
}

/** What a District Officer fills in to request an installment. */
export interface FundRequestInput {
  sourceWorkId: number;
  requestedAmount: number;
  remarks: string | null;
}

/**
 * A District Officer's installment/fund-release request (Escrow & Fund
 * Control). Decided `APPROVED`/`REJECTED` automatically at creation by a
 * rule-based eligibility engine (same style as {@link ProjectRisk}, decision
 * D22) — there is no manual approve/reject step. Rejected requests are never
 * deleted or hidden.
 *
 * `sanctionedAmount`/`alreadyReleased`/`remaining*` reflect the work's
 * *current* figures — computed live, not frozen at request time, same as how
 * risk is always assessed against current data rather than a snapshot.
 */
export interface FundRequest {
  id: string;
  sourceWorkId: number;
  workTitle: string;
  district: string | null;

  requestedByUsername: string | null;
  requestedByName: string | null;
  requestedAmount: number;
  remarks: string | null;
  /** ISO timestamp. */
  createdAt: string;

  sanctionedAmount: number | null;
  alreadyReleased: number | null;
  remainingBeforeRequest: number | null;
  remainingAfterRequest: number | null;

  /** The work's current risk assessment (D22) — shown for context. */
  riskLevel: RiskLevel | null;
  riskReasons: string[];

  status: FundRequestStatus;
  decisionReason: string;
  /** ISO timestamp. */
  decidedAt: string;

  /** "Send Release Notice to Bank" — a database flag only, never a real bank call. */
  releaseNoticeSent: boolean;
  releaseNoticeByName: string | null;
  /** ISO timestamp, or null if not sent yet. */
  releaseNoticeAt: string | null;

  /** ISO timestamp. */
  updatedAt: string;
  history: FundRequestEvent[];
}
