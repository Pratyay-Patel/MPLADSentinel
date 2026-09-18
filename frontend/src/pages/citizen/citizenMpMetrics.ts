import { formatCount, formatINRCompact } from '../../format';
import type { CitizenMpStat } from '../../data';
import { pct, type Metric } from '../compare/metrics';

const inr = (n: number) => formatINRCompact({ amount: n, currency: 'INR' });

/**
 * The citizen-safe metric list for `/citizen/compare` — the same shape as
 * `pages/compare/metrics.ts`'s `METRICS`, minus the two risk-derived entries
 * (`flaggedShare`, `avgRiskScore`) that don't exist on {@link CitizenMpStat}
 * in the first place.
 */
export const CITIZEN_METRICS: Metric<CitizenMpStat>[] = [
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
    key: 'fundUtilisation',
    label: 'Fund utilisation %',
    value: (m) => m.fundUtilisation ?? 0,
    fmt: (n) => `${Math.round(n * 100)}%`,
    format: (m) => pct(m.fundUtilisation),
    higherIsBetter: true,
  },
  {
    key: 'allocated',
    label: 'Allocated limit',
    value: (m) => m.allocated ?? 0,
    fmt: inr,
    format: (m) => (m.allocated == null ? '—' : inr(m.allocated)),
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
];
