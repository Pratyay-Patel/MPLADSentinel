import type { ProjectRisk } from '../types';

/**
 * Buckets a risk-engine reason string into a stable category so the dashboard
 * can show "what is driving risk across the dataset".
 *
 * `ProjectRisk.reasons` is free text (the `%`/month values vary per work), and
 * neither the demo engine (`rules.ts`) nor the backend (`/api/works/risk`)
 * exposes the underlying rule id. The demo and backend share the same reason
 * phrasing, so keyword matching classifies both. Keep in sync with
 * `rules.ts` / `RiskRuleSet.java` if the wording changes.
 */

export const RISK_FACTOR_CATEGORIES = [
  'Cost overspend',
  'Payout before completion',
  'Single-installment payout',
  'Dormant, no payments',
  'Cost outlier vs peers',
  'Payment data unavailable',
  'Other signal',
] as const;

export type RiskFactorCategory = (typeof RISK_FACTOR_CATEGORIES)[number];

export function classifyRiskReason(reason: string): RiskFactorCategory {
  const r = reason.toLowerCase();
  if (r.includes('exceed the estimated cost')) return 'Cost overspend';
  if (r.includes('released while the work is not marked complete')) return 'Payout before completion';
  if (r.includes('single installment')) return 'Single-installment payout';
  if (r.includes('no payment records')) return 'Dormant, no payments';
  if (r.includes('highest for the') && r.includes('category')) return 'Cost outlier vs peers';
  if (r.includes('could not be retrieved')) return 'Payment data unavailable';
  return 'Other signal';
}

/** URL-safe slug per category — used for `/risk?factor=<slug>` deep links from
 *  the Overview anomaly cards. Reversible via {@link riskFactorFromSlug}. */
export const RISK_FACTOR_SLUGS: Record<RiskFactorCategory, string> = {
  'Cost overspend': 'cost-overspend',
  'Payout before completion': 'payout-before-completion',
  'Single-installment payout': 'single-installment-payout',
  'Dormant, no payments': 'dormant-no-payments',
  'Cost outlier vs peers': 'cost-outlier-vs-peers',
  'Payment data unavailable': 'payment-data-unavailable',
  'Other signal': 'other-signal',
};

/** One neutral line per category for the anomaly cards. Phrased as indicators,
 *  never as confirmed findings (missing data stays "unknown", not "zero"). */
export const RISK_FACTOR_DESCRIPTIONS: Record<RiskFactorCategory, string> = {
  'Cost overspend': 'Recorded payments run above the sanctioned estimate.',
  'Payout before completion': 'Funds largely released while the work is not marked complete.',
  'Single-installment payout': 'The full amount released in a single installment.',
  'Dormant, no payments': 'Recommended long ago with no payment records yet.',
  'Cost outlier vs peers': 'Estimated cost is the highest within its category cohort.',
  'Payment data unavailable': 'Payment records could not be retrieved for the work.',
  'Other signal': 'Other statistical indicators flagged for review.',
};

export function riskFactorFromSlug(slug: string): RiskFactorCategory | null {
  for (const category of RISK_FACTOR_CATEGORIES) {
    if (RISK_FACTOR_SLUGS[category] === slug) return category;
  }
  return null;
}

export interface RiskFactorCount {
  label: RiskFactorCategory;
  count: number;
}

/**
 * Count how often each factor category appears across the given risk
 * assessments. Zero-count categories are dropped; the rest are sorted by count
 * descending, then by the canonical category order.
 */
export function summarizeRiskFactors(risks: Iterable<ProjectRisk>): RiskFactorCount[] {
  const counts = new Map<RiskFactorCategory, number>();
  for (const risk of risks) {
    for (const reason of risk.reasons) {
      const category = classifyRiskReason(reason);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return RISK_FACTOR_CATEGORIES.map((label) => ({ label, count: counts.get(label) ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || RISK_FACTOR_CATEGORIES.indexOf(a.label) - RISK_FACTOR_CATEGORIES.indexOf(b.label));
}
