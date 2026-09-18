import type { DataProvider } from '../DataProvider';
import type { PublicProject } from '../publicProject';
import type { Money } from '../types';

/**
 * Feature service for the Citizen Transparency Overview (`/citizen/overview`)
 * — a citizen-safe, stripped-down counterpart to the Government Dashboard's
 * national numbers.
 *
 * Built entirely from {@link DataProvider.listPublicProjects}, the same
 * publicly releasable data the Citizen Portal list already uses. There is no
 * risk donut, no anomaly cards and no "projects requiring attention" here —
 * those are risk-derived and stay authority-only. Every number below is a
 * plain roll-up of public fields (work counts, sanctioned cost, recorded
 * payments, completion status).
 */

export interface CitizenStateCount {
  state: string;
  works: number;
}

export interface CitizenOverviewData {
  totalWorks: number;
  recommendedWorks: number;
  completedWorks: number;
  /** null when there are no works at all (nothing to divide by). */
  completionRatePct: number | null;
  /** Sum over works with a known estimated cost; missing values are skipped, never treated as zero. */
  totalEstimatedCost: Money;
  /** Sum over works with `paymentDataState === 'FETCHED_PRESENT'`; same rule as above. */
  totalRecordedPayments: Money;
  /** Every state present in the dataset, work count only — no risk split. */
  states: CitizenStateCount[];
}

export interface CitizenOverviewService {
  load(signal?: AbortSignal): Promise<CitizenOverviewData>;
}

const DEFAULT_CURRENCY = 'INR';

export function createCitizenOverviewService(provider: DataProvider): CitizenOverviewService {
  return {
    async load(signal) {
      const projects = await provider.listPublicProjects(signal);
      return buildCitizenOverview(projects);
    },
  };
}

/** Pure roll-up, exported for testing without a provider. */
export function buildCitizenOverview(projects: PublicProject[]): CitizenOverviewData {
  const totalWorks = projects.length;
  const recommendedWorks = projects.filter(
    (p) => p.status === 'RECOMMENDED' || p.status === 'RECOMMENDED_AND_COMPLETED',
  ).length;
  const completedWorks = projects.filter(
    (p) => p.status === 'COMPLETED' || p.status === 'RECOMMENDED_AND_COMPLETED',
  ).length;

  const byState = new Map<string, number>();
  for (const project of projects) {
    const state = project.state?.trim();
    if (!state) continue;
    byState.set(state, (byState.get(state) ?? 0) + 1);
  }
  const states = [...byState.entries()]
    .map(([state, works]) => ({ state, works }))
    .sort((a, b) => b.works - a.works || a.state.localeCompare(b.state));

  return {
    totalWorks,
    recommendedWorks,
    completedWorks,
    completionRatePct: totalWorks > 0 ? (completedWorks / totalWorks) * 100 : null,
    totalEstimatedCost: sumMoney(projects.map((p) => p.estimatedCost)),
    totalRecordedPayments: sumMoney(projects.map((p) => p.recordedPayments)),
    states,
  };
}

function sumMoney(values: (Money | null)[]): Money {
  const present = values.filter((v): v is Money => v != null);
  const amount = present.reduce((sum, v) => sum + v.amount, 0);
  return { amount, currency: present[0]?.currency ?? DEFAULT_CURRENCY };
}
