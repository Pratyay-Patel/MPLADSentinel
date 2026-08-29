/**
 * Frontend seed fixtures, served through the DemoDataProvider until the
 * corresponding backend REST APIs exist. Once the ingestion-backed APIs land,
 * this file is replaced by data derived from real ingested MPLADS records with
 * no UI change.
 *
 * The record STRUCTURE mirrors the backend `Work` model exactly. State /
 * district / category values are drawn from the real domain value space
 * (docs/data-source.md §13); work descriptions and MP names are generic
 * placeholders.
 *
 * `demoRiskByWorkId` is a placeholder risk view model — there is no backend risk
 * engine yet (Round-1 P0.4 / requirements F3, F10). Its `reasons` use only
 * indicators the current data model can support (estimated-cost position,
 * payment-to-estimate ratio, dormant / no-payment signal, payment-pattern
 * signal).
 */

import type { Money, Project, ProjectRisk } from '../types';

/** Obviously-synthetic id range so a demo record can never be mistaken for a real work. */
const DEMO_ID_BASE = 900_000_000;

function inr(amount: number): Money {
  return { amount, currency: 'INR' };
}

interface DemoSpec {
  n: number;
  description: string;
  category: string;
  house: Project['house'];
  lsTerm: number | null;
  mpName: string;
  constituency: string;
  state: string;
  district: string;
  estimated: number | null;
  final: number | null;
  recommendedOn: string | null;
  recommendedYear: number | null;
  completedOn: string | null;
  completionYear: number | null;
  paymentDataState: Project['paymentDataState'];
  recorded: number | null;
  installments: number | null;
  flags?: string[];
}

function build(spec: DemoSpec): Project {
  const seenInRecommended = spec.recommendedYear != null || spec.recommendedOn != null;
  const seenInCompleted = spec.completionYear != null || spec.completedOn != null;
  const lifecycleState =
    seenInRecommended && seenInCompleted
      ? 'RECOMMENDED_AND_COMPLETED'
      : seenInCompleted
        ? 'COMPLETED'
        : 'RECOMMENDED';
  return {
    sourceName: 'EMPOWERED_INDIAN',
    sourceWorkId: DEMO_ID_BASE + spec.n,
    workDescription: spec.description,
    category: spec.category,
    house: spec.house,
    lsTerm: spec.lsTerm,
    mpName: spec.mpName,
    constituency: spec.constituency,
    state: spec.state,
    district: spec.district,
    locationRaw: `${spec.district} (Implementing District Authority)`,
    estimatedCost: spec.estimated == null ? null : inr(spec.estimated),
    finalCost: spec.final == null ? null : inr(spec.final),
    recommendedOn: spec.recommendedOn,
    recommendedYear: spec.recommendedYear,
    completedOn: spec.completedOn,
    completionYear: spec.completionYear,
    sourceStatusRaw: seenInRecommended ? 'Recommended' : null,
    expectedBeneficiaries: null,
    seenInRecommended,
    seenInCompleted,
    lifecycleState,
    paymentDataState: spec.paymentDataState,
    recordedPayments: spec.recorded == null ? null : inr(spec.recorded),
    paymentInstallments: spec.installments,
    dataQualityFlags: spec.flags ?? [],
  };
}

export const demoProjects: readonly Project[] = [
  build({
    n: 1,
    description: 'Construction of a community hall',
    category: 'Normal/Others',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'A. K. Sharma',
    constituency: 'Jaipur Rural',
    state: 'Rajasthan',
    district: 'Jaipur',
    estimated: 1_080_000,
    final: null,
    recommendedOn: '2025-02-10',
    recommendedYear: 2025,
    completedOn: null,
    completionYear: null,
    paymentDataState: 'NOT_FETCHED',
    recorded: null,
    installments: null,
    flags: ['HI_FIELDS_MIRROR_EN'],
  }),
  build({
    n: 2,
    description: 'Multipurpose community centre',
    category: 'Trust and Society',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'R. B. Patil',
    constituency: 'Pune',
    state: 'Maharashtra',
    district: 'Pune',
    estimated: 1_820_000,
    final: 1_690_000,
    recommendedOn: '2024-06-01',
    recommendedYear: 2024,
    completedOn: '2025-03-15',
    completionYear: 2025,
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 1_690_000,
    installments: 3,
  }),
  build({
    n: 3,
    description: 'Repair of an anganwadi building',
    category: 'Repair and Renovation',
    house: 'RAJYA_SABHA',
    lsTerm: null,
    mpName: 'S. Nair',
    constituency: 'Rajasthan',
    state: 'Rajasthan',
    district: 'Barmer',
    estimated: 620_000,
    final: null,
    recommendedOn: '2024-11-05',
    recommendedYear: 2024,
    completedOn: null,
    completionYear: null,
    paymentDataState: 'FETCHED_ABSENT',
    recorded: null,
    installments: null,
    flags: ['BENEFICIARIES_FIELD_UNPOPULATED'],
  }),
  build({
    n: 4,
    description: 'Upgradation of an approach road',
    category: 'Normal/Others',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'P. V. Reddy',
    constituency: 'Chittoor',
    state: 'Andhra Pradesh',
    district: 'Chittoor',
    estimated: 499_993,
    final: 499_993,
    recommendedOn: null,
    recommendedYear: null,
    completedOn: '2025-01-31',
    completionYear: 2025,
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 499_993,
    installments: 1,
  }),
  build({
    n: 5,
    description: 'Drinking-water supply scheme',
    category: 'Normal/Others',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'T. M. Thomas',
    constituency: 'Ernakulam',
    state: 'Kerala',
    district: 'Ernakulam',
    estimated: 2_500_000,
    final: null,
    recommendedOn: '2026-01-20',
    recommendedYear: 2026,
    completedOn: null,
    completionYear: null,
    paymentDataState: 'NOT_FETCHED',
    recorded: null,
    installments: null,
  }),
  build({
    n: 6,
    description: 'Library and reading room',
    category: 'Bar and Associations',
    house: 'RAJYA_SABHA',
    lsTerm: null,
    mpName: 'N. K. Singh',
    constituency: 'Uttar Pradesh',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    estimated: 1_200_000,
    final: 1_140_000,
    recommendedOn: '2023-09-12',
    recommendedYear: 2023,
    completedOn: '2024-08-20',
    completionYear: 2024,
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 980_000,
    installments: 2,
  }),
  build({
    n: 7,
    description: 'Solar street lighting',
    category: 'Normal/Others',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'K. G. Menon',
    constituency: 'Ernakulam',
    state: 'Kerala',
    district: 'Ernakulam',
    estimated: 545_767,
    final: 545_767,
    recommendedOn: null,
    recommendedYear: null,
    completedOn: '2025-06-30',
    completionYear: 2025,
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 545_767,
    installments: 2,
  }),
  build({
    n: 8,
    description: 'Renovation of a primary health sub-centre',
    category: 'Repair and Renovation',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'D. R. Deshmukh',
    constituency: 'Pune',
    state: 'Maharashtra',
    district: 'Pune',
    estimated: 350_000,
    final: null,
    recommendedOn: '2025-04-18',
    recommendedYear: 2025,
    completedOn: null,
    completionYear: null,
    paymentDataState: 'NOT_FETCHED',
    recorded: null,
    installments: null,
  }),
  build({
    n: 9,
    description: 'Construction of a bus waiting shed',
    category: 'Normal/Others',
    house: 'RAJYA_SABHA',
    lsTerm: null,
    mpName: 'M. L. Choudhary',
    constituency: 'Rajasthan',
    state: 'Rajasthan',
    district: 'Jodhpur',
    estimated: 875_000,
    final: null,
    recommendedOn: '2024-02-02',
    recommendedYear: 2024,
    completedOn: null,
    completionYear: null,
    paymentDataState: 'FETCH_ERROR',
    recorded: null,
    installments: null,
  }),
  build({
    n: 10,
    description: 'Sports ground development',
    category: 'Trust and Society',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'V. S. Ingle',
    constituency: 'Nagpur',
    state: 'Maharashtra',
    district: 'Nagpur',
    estimated: 1_500_000,
    final: 1_420_000,
    recommendedOn: '2024-07-10',
    recommendedYear: 2024,
    completedOn: '2025-05-05',
    completionYear: 2025,
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 1_420_000,
    installments: 4,
  }),
  build({
    n: 11,
    description: 'Additional classrooms for a government school',
    category: 'Normal/Others',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'H. P. Yadav',
    constituency: 'Varanasi',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    estimated: 600_000,
    final: null,
    recommendedOn: '2026-03-01',
    recommendedYear: 2026,
    completedOn: null,
    completionYear: null,
    paymentDataState: 'NOT_FETCHED',
    recorded: null,
    installments: null,
  }),
  build({
    n: 12,
    description: 'Rural sanitation block',
    category: 'Normal/Others',
    house: 'RAJYA_SABHA',
    lsTerm: null,
    mpName: 'L. N. Rao',
    constituency: 'Andhra Pradesh',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    estimated: 400_000,
    final: 390_000,
    recommendedOn: null,
    recommendedYear: null,
    completedOn: '2025-11-08',
    completionYear: 2025,
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 390_000,
    installments: 1,
  }),
  build({
    n: 13,
    description: 'Protection wall along a village pond',
    category: 'Repair and Renovation',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'J. P. Meena',
    constituency: 'Jaipur Rural',
    state: 'Rajasthan',
    district: 'Jaipur',
    estimated: 920_000,
    final: null,
    recommendedOn: '2023-05-14',
    recommendedYear: 2023,
    completedOn: null,
    completionYear: null,
    paymentDataState: 'NOT_FETCHED',
    recorded: null,
    installments: null,
    flags: ['HI_FIELDS_MIRROR_EN'],
  }),
  build({
    n: 14,
    description: 'Crematorium shed improvement',
    category: 'Normal/Others',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'B. C. Das',
    constituency: 'Howrah',
    state: 'West Bengal',
    district: 'Howrah',
    estimated: 750_000,
    final: null,
    recommendedOn: '2025-08-01',
    recommendedYear: 2025,
    completedOn: null,
    completionYear: null,
    paymentDataState: 'NOT_FETCHED',
    recorded: null,
    installments: null,
  }),
];

function risk(
  n: number,
  level: ProjectRisk['level'],
  score: number | null,
  reasons: string[],
): [number, ProjectRisk] {
  return [
    DEMO_ID_BASE + n,
    {
      sourceWorkId: DEMO_ID_BASE + n,
      level,
      score,
      reasons,
      assessedAt: level === 'UNKNOWN' ? null : '2026-08-01T00:00:00Z',
    },
  ];
}

/** Placeholder risk view models keyed by `sourceWorkId` (no risk engine yet). */
export const demoRiskByWorkId: ReadonlyMap<number, ProjectRisk> = new Map([
  risk(1, 'HIGH', 78, [
    'recommended over 12 months ago with no payment records',
    'estimated cost in the upper range for its category cohort',
  ]),
  risk(2, 'HIGH', 71, [
    'recorded payments are 93% of estimated cost',
    'full sanctioned amount released across few installments',
  ]),
  risk(3, 'MEDIUM', 52, [
    'payments endpoint reports no records for a work recommended 18+ months ago',
  ]),
  risk(4, 'HIGH', 69, [
    'recorded payments equal estimated cost (100%)',
    'full amount released in a single installment',
  ]),
  risk(5, 'MEDIUM', 48, ['estimated cost is the highest in the current dataset for its category']),
  risk(6, 'LOW', 18, ['recorded payments below estimated cost with no other indicators']),
  risk(7, 'LOW', 12, ['completed work with recorded payments consistent with final cost']),
  risk(8, 'LOW', 22, ['recently recommended; no indicators yet']),
  risk(9, 'MEDIUM', 44, ['payment data could not be retrieved (fetch error) for review']),
  risk(10, 'HIGH', 66, [
    'recorded payments are 95% of estimated cost',
    'estimated cost in the upper range for its category cohort',
  ]),
  risk(11, 'UNKNOWN', null, []),
  risk(12, 'MEDIUM', 41, ['full amount released in a single installment on completion']),
  risk(13, 'HIGH', 74, ['recommended ~3 years ago with no payment records (dormant)']),
  risk(14, 'LOW', 16, ['recently recommended; no indicators yet']),
]);
