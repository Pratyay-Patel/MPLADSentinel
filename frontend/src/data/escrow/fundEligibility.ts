import type { FundRequestStatus, Project, ProjectRisk } from '../types';

/**
 * Escrow & Fund Control eligibility decision — the **demo-mode** source. A
 * direct port of the real Round-1 engine (`com.mpladsentinel.escrow.FundEligibilityEngine`)
 * — same two checks, same order, kept in sync by hand, same convention as
 * `risk/rules.ts` for D22 and `dedup/duplicateRules.ts` for D35.
 *
 * Two independent checks, either of which rejects on its own; `APPROVED`
 * only when both pass. Rule-based and deterministic — no ML, no smart
 * contract. Also used client-side to preview the eligibility summary before
 * a District Officer submits, in both demo and real (`api`) mode, since the
 * frontend already has the `Project` + `ProjectRisk` data loaded either way.
 */
export interface FundEligibilityDecision {
  status: FundRequestStatus;
  reason: string;
}

/** Mirrors the backend rule: recorded payments only count once the payments endpoint has returned rows. */
export function alreadyReleasedAmount(project: Project): number {
  return project.paymentDataState === 'FETCHED_PRESENT' && project.recordedPayments != null
    ? project.recordedPayments.amount
    : 0;
}

/** `estimatedCost - alreadyReleased`, or `null` when there's no sanctioned amount to compute from. */
export function remainingFunds(project: Project): number | null {
  const estimatedCost = project.estimatedCost?.amount ?? null;
  return estimatedCost == null ? null : estimatedCost - alreadyReleasedAmount(project);
}

export function evaluateFundEligibility(
  project: Project,
  requestedAmount: number,
  risk: ProjectRisk | null,
): FundEligibilityDecision {
  const remaining = remainingFunds(project);
  if (remaining == null) {
    return {
      status: 'REJECTED',
      reason: 'Sanctioned amount is not available for this work, so eligibility cannot be verified.',
    };
  }

  if (requestedAmount > remaining) {
    return {
      status: 'REJECTED',
      reason: `Requested amount (₹${requestedAmount.toFixed(2)}) exceeds the remaining sanctioned funds (₹${remaining.toFixed(2)}).`,
    };
  }

  if (risk != null && risk.level === 'HIGH') {
    return {
      status: 'REJECTED',
      reason: `This work is currently assessed as HIGH risk: ${risk.reasons.join('; ')}.`,
    };
  }

  return {
    status: 'APPROVED',
    reason: `Requested amount is within the remaining sanctioned funds (₹${remaining.toFixed(2)}) and the work is not assessed HIGH risk.`,
  };
}
