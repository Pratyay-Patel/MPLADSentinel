import { formatCount, formatINRCompact } from '../../format';
import type { MpStat } from '../../data';

/** Ratio (0–1) → whole-percent string; em dash for null. */
export function pct(n: number | null): string {
  return n == null ? '—' : `${Math.round(n * 100)}%`;
}

const inr = (n: number) => formatINRCompact({ amount: n, currency: 'INR' });

export interface Metric {
  key: string;
  label: string;
  /** Numeric value for the bar / axis; a `null` underlying value contributes 0. */
  value: (m: MpStat) => number;
  /** Format a raw number (axis ticks, reference line). */
  fmt: (n: number) => string;
  /** Format for one MP (bar label, table) — shows an em dash when undefined. */
  format: (m: MpStat) => string;
  /** Higher is "better" — drives the key-insight wording and bar tone. */
  higherIsBetter: boolean;
}

export const METRICS: Metric[] = [
  {
    key: 'works',
    label: 'Total works',
    value: (m) => m.works,
    fmt: formatCount,
    format: (m) => formatCount(m.works),
    higherIsBetter: true,
  },
  {
    key: 'completed',
    label: 'Completed works',
    value: (m) => m.completed,
    fmt: formatCount,
    format: (m) => formatCount(m.completed),
    higherIsBetter: true,
  },
  {
    key: 'completionRate',
    label: 'Completion rate',
    value: (m) => m.completionRate ?? 0,
    fmt: (n) => `${Math.round(n * 100)}%`,
    format: (m) => pct(m.completionRate),
    higherIsBetter: true,
  },
  {
    key: 'recordedPayments',
    label: 'Recorded payments',
    value: (m) => m.recordedPayments.amount,
    fmt: inr,
    format: (m) => formatINRCompact(m.recordedPayments),
    higherIsBetter: true,
  },
  {
    key: 'estimatedCost',
    label: 'Estimated cost (Σ)',
    value: (m) => m.estimatedCost.amount,
    fmt: inr,
    format: (m) => formatINRCompact(m.estimatedCost),
    higherIsBetter: true,
  },
  {
    key: 'flaggedShare',
    label: 'Flagged share (HIGH + MEDIUM)',
    value: (m) => m.flaggedShare ?? 0,
    fmt: (n) => `${Math.round(n * 100)}%`,
    format: (m) => pct(m.flaggedShare),
    higherIsBetter: false,
  },
  {
    key: 'avgRiskScore',
    label: 'Average risk score',
    value: (m) => m.avgRiskScore ?? 0,
    fmt: (n) => n.toFixed(0),
    format: (m) => (m.avgRiskScore == null ? '—' : m.avgRiskScore.toFixed(1)),
    higherIsBetter: false,
  },
];

/** The 4 categorical series colours (dataviz palette slots 1–4), theme-swapped in compare.css. */
export const MP_SERIES_VARS = ['var(--mpc-s1)', 'var(--mpc-s2)', 'var(--mpc-s3)', 'var(--mpc-s4)'];
