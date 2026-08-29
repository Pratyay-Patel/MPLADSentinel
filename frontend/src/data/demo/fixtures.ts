/**
 * DEVELOPMENT DEMO FIXTURES — NOT REAL MPLADS DATA.
 *
 * These records exist only to prove the data-provider architecture and to let UI
 * screens be built before the corresponding backend APIs land. Identifiers,
 * names and places are obviously synthetic ("DEMO ..."); the *structure* mirrors
 * the backend `Work` model exactly.
 *
 * A later phase replaces this file's contents with fixtures derived from real
 * ingested MPLADS records (still served through the DemoDataProvider) — no UI
 * change is required when that happens.
 */

import type { Project, ProjectRisk } from '../types';

export const DEMO_DISCLAIMER =
  'Development demo data — not real MPLADS records. Structure mirrors the backend Work model; ' +
  'all values are illustrative.';

/** Obviously-synthetic id range so a demo record can never be mistaken for a real work. */
const DEMO_ID_BASE = 900_000_000;

export const demoProjects: readonly Project[] = [
  {
    sourceName: 'EMPOWERED_INDIAN',
    sourceWorkId: DEMO_ID_BASE + 1,
    workDescription: 'DEMO work: construction of a community hall (illustrative).',
    category: 'Normal/Others',
    house: 'LOK_SABHA',
    lsTerm: 18,
    mpName: 'DEMO MP ALPHA',
    constituency: 'DEMO CONSTITUENCY 1',
    state: 'Demo State',
    district: 'DEMO DISTRICT 1',
    locationRaw: 'DEMO LOCATION 1 (Implementing District Authority)',
    estimatedCost: { amount: 2_500_000, currency: 'INR' },
    finalCost: null,
    recommendedOn: '2026-01-20',
    recommendedYear: 2026,
    completedOn: null,
    completionYear: null,
    sourceStatusRaw: 'Recommended',
    expectedBeneficiaries: null,
    seenInRecommended: true,
    seenInCompleted: false,
    lifecycleState: 'RECOMMENDED',
    paymentDataState: 'NOT_FETCHED',
    recordedPayments: null,
    paymentInstallments: null,
    dataQualityFlags: ['HI_FIELDS_MIRROR_EN'],
  },
  {
    sourceName: 'EMPOWERED_INDIAN',
    sourceWorkId: DEMO_ID_BASE + 2,
    workDescription: 'DEMO work: upgradation of a rural road (illustrative).',
    category: 'Normal/Others',
    house: null,
    lsTerm: null,
    mpName: 'DEMO MP BETA',
    constituency: 'DEMO CONSTITUENCY 2',
    state: 'Demo State',
    district: 'DEMO DISTRICT 2',
    locationRaw: 'DEMO LOCATION 2 (District Collector)',
    estimatedCost: null,
    finalCost: { amount: 4_486_722, currency: 'INR' },
    recommendedOn: null,
    recommendedYear: null,
    completedOn: '2025-01-31',
    completionYear: 2025,
    sourceStatusRaw: null,
    expectedBeneficiaries: null,
    seenInRecommended: false,
    seenInCompleted: true,
    lifecycleState: 'COMPLETED',
    paymentDataState: 'FETCHED_PRESENT',
    recordedPayments: { amount: 4_486_722, currency: 'INR' },
    paymentInstallments: 2,
    dataQualityFlags: ['HI_FIELDS_MIRROR_EN', 'BENEFICIARIES_FIELD_UNPOPULATED'],
  },
  {
    sourceName: 'EMPOWERED_INDIAN',
    sourceWorkId: DEMO_ID_BASE + 3,
    workDescription: 'DEMO work: drinking-water supply scheme (illustrative).',
    category: 'Repair and Renovation',
    house: 'RAJYA_SABHA',
    lsTerm: null,
    mpName: 'DEMO MP GAMMA',
    constituency: 'DEMO CONSTITUENCY 3',
    state: 'Demo State',
    district: 'DEMO DISTRICT 3',
    locationRaw: 'DEMO LOCATION 3',
    estimatedCost: { amount: 1_800_000, currency: 'INR' },
    finalCost: { amount: 1_750_000, currency: 'INR' },
    recommendedOn: '2024-11-05',
    recommendedYear: 2024,
    completedOn: '2025-09-12',
    completionYear: 2025,
    sourceStatusRaw: 'Recommended',
    expectedBeneficiaries: null,
    seenInRecommended: true,
    seenInCompleted: true,
    lifecycleState: 'RECOMMENDED_AND_COMPLETED',
    paymentDataState: 'FETCHED_ABSENT',
    recordedPayments: null,
    paymentInstallments: null,
    dataQualityFlags: [],
  },
];

/** Illustrative risk records keyed by `sourceWorkId`. Reasons are prefixed "Demo:" on purpose. */
export const demoRiskByWorkId: ReadonlyMap<number, ProjectRisk> = new Map([
  [
    DEMO_ID_BASE + 1,
    {
      sourceWorkId: DEMO_ID_BASE + 1,
      level: 'MEDIUM',
      score: 55,
      reasons: [
        'Demo: recommended over 6 months ago with no recorded payments',
        'Demo: estimated cost above the demo category median',
      ],
      assessedAt: '2026-08-01T00:00:00Z',
    },
  ],
  [
    DEMO_ID_BASE + 2,
    {
      sourceWorkId: DEMO_ID_BASE + 2,
      level: 'LOW',
      score: 15,
      reasons: ['Demo: completed with recorded payments matching final cost'],
      assessedAt: '2026-08-01T00:00:00Z',
    },
  ],
  [
    DEMO_ID_BASE + 3,
    {
      sourceWorkId: DEMO_ID_BASE + 3,
      level: 'UNKNOWN',
      score: null,
      reasons: [],
      assessedAt: null,
    },
  ],
]);
