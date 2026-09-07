import type { Project, ProjectRisk, RiskLevel } from '../types';

/**
 * Statistical risk model (Round-1 baseline) — the **demo-mode** risk source.
 *
 * A weighted scoring model: each factor below contributes a fixed number of
 * points; the 0–100 score is their sum (capped). The real Round-1 engine runs
 * server-side in Spring Boot (decision D22, `com.mpladsentinel.mplads.risk`);
 * `ApiDataProvider` reads it via `/api/works/risk`. This module is used **only by
 * `DemoDataProvider`** so `VITE_DATA_SOURCE=demo` still shows scores without a
 * backend. The two implementations share the same factor ids, weights and
 * thresholds and are kept in sync by hand.
 *
 * Every factor uses only fields the verified MPLADS source provides. There is
 * deliberately NO physical-progress, geospatial, duplicate-project or
 * delay-prediction factor (docs/data-source.md §14 — the source has none of
 * that). This baseline is the calibration layer the planned ensemble trains
 * against; it is not itself a trained model.
 */

export interface RiskContext {
  /** Every project in the current set — for category-cohort comparisons. */
  allProjects: Project[];
  /** "Now" for age calculations. Fixed for the demo so results are deterministic. */
  asOf: Date;
}

interface RuleHit {
  rule: string;
  reason: string;
  weight: number;
}

type Rule = (project: Project, ctx: RiskContext) => RuleHit | null;

const HIGH_SCORE = 55;
const MEDIUM_SCORE = 25;
const DORMANT_MONTHS = 12;
const DORMANT_LONG_MONTHS = 24;
const DORMANT_VERY_LONG_MONTHS = 36;
const COHORT_MIN_SIZE = 4;
const MS_PER_MONTH = (365.25 / 12) * 24 * 60 * 60 * 1000;

/** Recorded-payments ÷ estimated-cost, when both are known and the estimate is positive. */
export function paymentRatio(project: Project): number | null {
  const est = project.estimatedCost?.amount ?? 0;
  const paid = project.recordedPayments?.amount ?? null;
  if (paid == null || est <= 0) return null;
  return paid / est;
}

function pctOver(a: number, b: number): number {
  return Math.round((a / b - 1) * 100);
}

function recommendedDate(project: Project): Date | null {
  if (project.recommendedOn) return new Date(project.recommendedOn);
  if (project.recommendedYear != null) return new Date(Date.UTC(project.recommendedYear, 5, 30));
  return null;
}

function monthsSince(date: Date, asOf: Date): number {
  return Math.max(0, Math.floor((asOf.getTime() - date.getTime()) / MS_PER_MONTH));
}

// --- rules -------------------------------------------------------

const overspend: Rule = (project) => {
  const est = project.estimatedCost?.amount;
  const paid = project.recordedPayments?.amount;
  if (est == null || paid == null || paid <= est) return null;
  return {
    rule: 'PAYMENT_OVERSPEND',
    reason: `Recorded payments exceed the estimated cost by ${pctOver(paid, est)}%`,
    weight: 45,
  };
};

const fullPayoutBeforeCompletion: Rule = (project) => {
  if (project.seenInCompleted) return null;
  const ratio = paymentRatio(project);
  if (ratio == null || ratio < 0.9) return null;
  return {
    rule: 'FULL_PAYOUT_BEFORE_COMPLETION',
    reason: `${Math.round(ratio * 100)}% of the estimated cost released while the work is not marked complete`,
    weight: 45,
  };
};

const singleInstallmentFull: Rule = (project) => {
  const ratio = paymentRatio(project);
  if (project.paymentInstallments !== 1 || ratio == null || ratio < 0.95) return null;
  return {
    rule: 'SINGLE_INSTALLMENT_FULL',
    reason: 'Full amount released in a single installment',
    weight: 25,
  };
};

const dormantNoPayments: Rule = (project, ctx) => {
  if (project.seenInCompleted) return null;
  if (project.paymentDataState !== 'NOT_FETCHED' && project.paymentDataState !== 'FETCHED_ABSENT') {
    return null;
  }
  const recommended = recommendedDate(project);
  if (!recommended) return null;
  const months = monthsSince(recommended, ctx.asOf);
  if (months < DORMANT_MONTHS) return null;

  const weight = months >= DORMANT_VERY_LONG_MONTHS ? 55 : months >= DORMANT_LONG_MONTHS ? 45 : 30;
  const tail = months >= DORMANT_VERY_LONG_MONTHS ? ' (long-dormant)' : '';
  return {
    rule: 'DORMANT_NO_PAYMENTS',
    reason: `Recommended ${months} months ago with no payment records${tail}`,
    weight,
  };
};

const costCohortOutlier: Rule = (project, ctx) => {
  const est = project.estimatedCost?.amount;
  if (est == null || !project.category) return null;
  const cohort = ctx.allProjects
    .filter((p) => p.category === project.category && p.estimatedCost != null)
    .map((p) => p.estimatedCost!.amount);
  if (cohort.length < COHORT_MIN_SIZE) return null;
  if (est < Math.max(...cohort)) return null;
  return {
    rule: 'COST_COHORT_OUTLIER',
    reason: `Estimated cost is the highest for the ${project.category} category among comparable works`,
    weight: 25,
  };
};

const paymentDataUnavailable: Rule = (project) => {
  if (project.paymentDataState !== 'FETCH_ERROR') return null;
  return {
    rule: 'PAYMENT_DATA_UNAVAILABLE',
    reason: 'Payment data could not be retrieved for review',
    weight: 25,
  };
};

const RULES: Rule[] = [
  overspend,
  fullPayoutBeforeCompletion,
  singleInstallmentFull,
  dormantNoPayments,
  costCohortOutlier,
  paymentDataUnavailable,
];

/** Rule ids + human titles, for a "how this works" note. */
export const RISK_RULES: { id: string; title: string }[] = [
  { id: 'PAYMENT_OVERSPEND', title: 'Recorded payments exceed the estimated cost' },
  { id: 'FULL_PAYOUT_BEFORE_COMPLETION', title: 'Most of the cost released before completion' },
  { id: 'SINGLE_INSTALLMENT_FULL', title: 'Full amount released in one installment' },
  { id: 'DORMANT_NO_PAYMENTS', title: 'Recommended long ago with no payment records' },
  { id: 'COST_COHORT_OUTLIER', title: 'Estimated cost is the highest for its category' },
  { id: 'PAYMENT_DATA_UNAVAILABLE', title: 'Payment data could not be retrieved' },
];

// --- entry point ----------------------------------------------

function levelFor(score: number): RiskLevel {
  if (score >= HIGH_SCORE) return 'HIGH';
  if (score >= MEDIUM_SCORE) return 'MEDIUM';
  return 'LOW';
}

function isAssessable(project: Project): boolean {
  return (
    project.estimatedCost != null ||
    project.finalCost != null ||
    project.paymentDataState === 'FETCHED_PRESENT'
  );
}

/**
 * Evaluate the placeholder rules for one project.
 * - `UNKNOWN` — not enough data to assess (no cost figures, no payment records).
 * - `LOW` with no reasons — assessed, nothing flagged.
 */
export function deriveRisk(project: Project, ctx: RiskContext): ProjectRisk {
  const hits = RULES.map((rule) => rule(project, ctx)).filter((hit): hit is RuleHit => hit != null);

  if (hits.length === 0 && !isAssessable(project)) {
    return {
      sourceWorkId: project.sourceWorkId,
      level: 'UNKNOWN',
      score: null,
      reasons: [],
      assessedAt: null,
    };
  }

  const score = Math.min(
    100,
    hits.reduce((total, hit) => total + hit.weight, 0),
  );
  return {
    sourceWorkId: project.sourceWorkId,
    level: levelFor(score),
    score,
    reasons: hits.map((hit) => hit.reason),
    assessedAt: ctx.asOf.toISOString(),
  };
}

/** A concise one-line headline for a risk badge. */
export function riskHeadline(risk: ProjectRisk): string {
  if (risk.level === 'UNKNOWN') return 'Not yet assessed';
  if (risk.reasons.length === 0) return 'No current indicators';
  if (risk.reasons.length === 1) return risk.reasons[0];
  return `${risk.reasons.length} indicators detected`;
}
