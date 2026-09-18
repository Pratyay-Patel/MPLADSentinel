import type { LifecycleState, Money, PaymentDataState, Project, ProjectHouse } from './types';

/**
 * The publicly releasable view of an MPLADS work — the only project shape a
 * citizen ever receives.
 *
 * It deliberately does not carry risk scores, data-quality flags, or
 * source-provenance framing. It does carry the **recorded-payment summary**
 * (`paymentDataState`, `recordedPayments`, `paymentInstallments`) — plain
 * public expenditure data, not a risk signal — so the Citizen Portal can show
 * where the money went (the individual installment rows come from the
 * separate {@link DataProvider.getPublicProjectPayments} call). In `api` mode
 * this is enforced server-side (`GET /api/public/works` returns only these
 * fields); in `demo` mode {@link toPublicProject} narrows a `Project` to the
 * same shape. A component cannot leak what it never receives.
 */
export interface PublicProject {
  /** Source work id — used only to address the public detail route. Never shown as an official id. */
  reference: number;
  workDescription: string | null;
  category: string | null;
  state: string | null;
  district: string | null;
  location: string | null;
  house: ProjectHouse | null;
  lsTerm: number | null;
  memberOfParliament: string | null;
  constituency: string | null;
  estimatedCost: Money | null;
  finalCost: Money | null;
  status: LifecycleState;
  sourceStatus: string | null;
  expectedBeneficiaries: number | null;
  recommendedOn: string | null;
  recommendedYear: number | null;
  completedOn: string | null;
  completionYear: number | null;
  /** Whether payment records were retrieved for this work, and their availability. */
  paymentDataState: PaymentDataState;
  /** Total recorded via the payments endpoint; null unless `paymentDataState === 'FETCHED_PRESENT'`. */
  recordedPayments: Money | null;
  paymentInstallments: number | null;
}

/** Narrows a full {@link Project} to the publicly releasable {@link PublicProject}. */
export function toPublicProject(project: Project): PublicProject {
  return {
    reference: project.sourceWorkId,
    workDescription: project.workDescription,
    category: project.category,
    state: project.state,
    district: project.district,
    location: project.locationRaw,
    house: project.house,
    lsTerm: project.lsTerm,
    memberOfParliament: project.mpName,
    constituency: project.constituency,
    estimatedCost: project.estimatedCost,
    finalCost: project.finalCost,
    status: project.lifecycleState,
    sourceStatus: project.sourceStatusRaw,
    expectedBeneficiaries: project.expectedBeneficiaries,
    recommendedOn: project.recommendedOn,
    recommendedYear: project.recommendedYear,
    completedOn: project.completedOn,
    completionYear: project.completionYear,
    paymentDataState: project.paymentDataState,
    recordedPayments: project.recordedPayments,
    paymentInstallments: project.paymentInstallments,
  };
}
