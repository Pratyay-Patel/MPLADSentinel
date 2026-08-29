/**
 * Frontend seed fixtures, served through the DemoDataProvider until the
 * corresponding backend REST APIs exist. Once the ingestion-backed APIs land,
 * this file is replaced by data derived from real ingested MPLADS records with
 * no UI change.
 *
 * The record STRUCTURE mirrors the backend `Work` model exactly. State /
 * district / category values are drawn from the real domain value space
 * (docs/data-source.md §13); work descriptions and MP names are generic
 * placeholders. Each record is shaped to exercise a distinct rule outcome in
 * `src/data/risk/rules.ts` (relative to {@link RISK_REFERENCE_DATE}).
 */

import type { Money, PaymentInstallment, Project } from '../types';

/** Obviously-synthetic id range so a seed record can never be mistaken for a real work. */
const DEMO_ID_BASE = 900_000_000;

/** Fixed "now" for the demo so rule ages (dormant, etc.) are deterministic. */
export const RISK_REFERENCE_DATE = new Date('2026-09-01T00:00:00.000Z');

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
  completedOn: string | null;
  paymentDataState: Project['paymentDataState'];
  recorded: number | null;
  installments: number | null;
  flags?: string[];
}

function yearOf(iso: string | null): number | null {
  return iso ? Number(iso.slice(0, 4)) : null;
}

function build(spec: DemoSpec): Project {
  const seenInRecommended = spec.recommendedOn != null;
  const seenInCompleted = spec.completedOn != null;
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
    recommendedYear: yearOf(spec.recommendedOn),
    completedOn: spec.completedOn,
    completionYear: yearOf(spec.completedOn),
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
    estimated: 1_050_000,
    final: null,
    recommendedOn: '2023-06-05',
    completedOn: null,
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
    estimated: 1_800_000,
    final: null,
    recommendedOn: '2024-06-01',
    completedOn: null,
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 1_960_000,
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
    completedOn: null,
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
    estimated: 500_000,
    final: 640_000,
    recommendedOn: null,
    completedOn: '2025-01-31',
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 640_000,
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
    estimated: 2_600_000,
    final: null,
    recommendedOn: '2025-02-20',
    completedOn: null,
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
    completedOn: '2024-08-20',
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
    estimated: 545_000,
    final: 545_000,
    recommendedOn: null,
    completedOn: '2025-06-30',
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 545_000,
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
    completedOn: null,
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
    completedOn: null,
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
    final: null,
    recommendedOn: '2024-07-10',
    completedOn: null,
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 1_610_000,
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
    estimated: null,
    final: null,
    recommendedOn: '2026-06-01',
    completedOn: null,
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
    final: 400_000,
    recommendedOn: null,
    completedOn: '2025-11-08',
    paymentDataState: 'FETCHED_PRESENT',
    recorded: 400_000,
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
    estimated: 900_000,
    final: null,
    recommendedOn: '2026-05-14',
    completedOn: null,
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
    estimated: null,
    final: null,
    recommendedOn: '2026-07-01',
    completedOn: null,
    paymentDataState: 'NOT_FETCHED',
    recorded: null,
    installments: null,
  }),
];

function installment(
  ordinal: number,
  amount: number,
  paidOn: string,
  vendorName: string,
  implementingAuthorityText: string,
): PaymentInstallment {
  return {
    ordinal,
    amount: inr(amount),
    paidOn,
    vendorName,
    statusRaw: 'Payment Success',
    implementingAuthorityText,
  };
}

/**
 * Installment rows for works whose `paymentDataState === 'FETCHED_PRESENT'`.
 * Sums and counts match the corresponding project's `recordedPayments` /
 * `paymentInstallments`.
 */
export const demoPaymentsByWorkId: ReadonlyMap<number, PaymentInstallment[]> = new Map([
  [
    DEMO_ID_BASE + 2,
    [
      installment(
        0,
        700_000,
        '2024-08-15',
        'Shree Constructions',
        'PUNE (Implementing District Authority)',
      ),
      installment(
        1,
        700_000,
        '2024-12-10',
        'Shree Constructions',
        'PUNE (Implementing District Authority)',
      ),
      installment(
        2,
        560_000,
        '2025-02-20',
        'Shree Constructions',
        'PUNE (Implementing District Authority)',
      ),
    ],
  ],
  [
    DEMO_ID_BASE + 4,
    [installment(0, 640_000, '2025-01-20', 'Balaji Infra Works', 'CHITTOOR (District Collector)')],
  ],
  [
    DEMO_ID_BASE + 6,
    [
      installment(
        0,
        500_000,
        '2024-01-12',
        'Ganga Suppliers',
        'LUCKNOW (Implementing District Authority)',
      ),
      installment(
        1,
        480_000,
        '2024-07-05',
        'Ganga Suppliers',
        'LUCKNOW (Implementing District Authority)',
      ),
    ],
  ],
  [
    DEMO_ID_BASE + 7,
    [
      installment(
        0,
        300_000,
        '2025-04-10',
        'Coastal Electricals',
        'ERNAKULAM (District Collector)',
      ),
      installment(
        1,
        245_000,
        '2025-06-22',
        'Coastal Electricals',
        'ERNAKULAM (District Collector)',
      ),
    ],
  ],
  [
    DEMO_ID_BASE + 10,
    [
      installment(
        0,
        450_000,
        '2024-10-01',
        'Vidarbha Works',
        'NAGPUR (Implementing District Authority)',
      ),
      installment(
        1,
        450_000,
        '2025-01-15',
        'Vidarbha Works',
        'NAGPUR (Implementing District Authority)',
      ),
      installment(
        2,
        450_000,
        '2025-03-20',
        'Vidarbha Works',
        'NAGPUR (Implementing District Authority)',
      ),
      installment(
        3,
        260_000,
        '2025-05-02',
        'Vidarbha Works',
        'NAGPUR (Implementing District Authority)',
      ),
    ],
  ],
  [
    DEMO_ID_BASE + 12,
    [installment(0, 400_000, '2025-11-01', 'Sanitation Systems Co', 'GUNTUR (District Collector)')],
  ],
]);
