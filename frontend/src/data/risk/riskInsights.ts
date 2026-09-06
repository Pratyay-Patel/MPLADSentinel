import { classifyRiskReason, type RiskFactorCategory } from './riskFactors';
import type { ProjectRisk } from '../types';

/**
 * Project-detail risk insights, derived from the SAME `ProjectRisk` view model
 * the dashboard and Risk & Alerts already use (`reasons` + `level`). Nothing here
 * invents a number: every value traces back to a rule the engine actually fired
 * (`rules.ts` in demo mode, `/api/works/risk` / `RiskRuleSet.java` on the
 * backend). The competitor app shows fabricated per-dimension "/100" scores;
 * we only claim what the rules tell us.
 */

/** The six real rule dimensions, in the order they should be shown. */
export const RISK_DIMENSIONS: { category: RiskFactorCategory; blurb: string }[] = [
  { category: 'Cost overspend', blurb: 'Recorded payments are above the estimated cost.' },
  {
    category: 'Payout before completion',
    blurb: 'Most of the cost was released while the work is not marked complete.',
  },
  { category: 'Single-installment payout', blurb: 'The whole amount was released in one installment.' },
  {
    category: 'Dormant, no payments',
    blurb: 'Recommended long ago with no payment records against it.',
  },
  { category: 'Cost outlier vs peers', blurb: 'Highest estimated cost among comparable works in its category.' },
  { category: 'Payment data unavailable', blurb: 'Payment records could not be retrieved for review.' },
];

export interface RiskDimension {
  label: RiskFactorCategory;
  blurb: string;
  /** True when at least one of this work's reasons falls in this category. */
  flagged: boolean;
  /** The matching reason string when flagged, else `null`. */
  note: string | null;
}

/**
 * Map this work's risk reasons onto the six dimensions. Every dimension is
 * returned (flagged or not) so the strip reads as a fixed checklist.
 */
export function riskDimensions(risk: ProjectRisk): RiskDimension[] {
  const firstReasonByCategory = new Map<RiskFactorCategory, string>();
  for (const reason of risk.reasons) {
    const category = classifyRiskReason(reason);
    if (!firstReasonByCategory.has(category)) firstReasonByCategory.set(category, reason);
  }
  return RISK_DIMENSIONS.map(({ category, blurb }) => ({
    label: category,
    blurb,
    flagged: firstReasonByCategory.has(category),
    note: firstReasonByCategory.get(category) ?? null,
  }));
}

/** Suggested first step for a reviewer, keyed to the triggering category. */
const ACTION_BY_CATEGORY: Record<RiskFactorCategory, string> = {
  'Cost overspend':
    'Reconcile the recorded payments against the sanctioned estimate and obtain a written explanation for the excess before any further release.',
  'Payout before completion':
    'Verify physical progress on the ground and confirm the completion status before releasing the remaining amount.',
  'Single-installment payout':
    'Check that the single full release followed the sanctioned installment schedule and was backed by completion evidence.',
  'Dormant, no payments':
    'Confirm whether the work has actually started; if it has stalled, review it for de-recommendation or reallocation.',
  'Cost outlier vs peers':
    'Compare the estimate line-items against similar works in the same category and confirm the rate analysis.',
  'Payment data unavailable':
    'Retry the payment-records fetch; if it keeps failing, request the disbursement statement from the implementing agency.',
  'Other signal': 'Review the flagged indicator and record an assessment note.',
};

export interface RecommendedAction {
  category: RiskFactorCategory;
  /** The reason string this recommendation responds to. */
  trigger: string;
  action: string;
}

/**
 * A single "recommended next action" for the reviewer, based on the first
 * (highest-listed) indicator the engine reported. `null` when the work is
 * UNKNOWN or has no indicators — there is nothing to act on.
 */
export function recommendedAction(risk: ProjectRisk): RecommendedAction | null {
  if (risk.level === 'UNKNOWN' || risk.reasons.length === 0) return null;
  const trigger = risk.reasons[0];
  const category = classifyRiskReason(trigger);
  return { category, trigger, action: ACTION_BY_CATEGORY[category] };
}
