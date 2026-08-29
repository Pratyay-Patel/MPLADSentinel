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
