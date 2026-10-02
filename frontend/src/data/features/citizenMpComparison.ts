import type { DataProvider } from '../DataProvider';
import { lookupAllocation } from '../mpAllocations';
import type { PublicProject } from '../publicProject';
import type { Money, ProjectHouse } from '../types';

/**
 * Feature service for the citizen-safe "Compare MPs" (`/citizen/compare`).
 *
 * Same aggregation as {@link ../mpComparison.ts}'s authority version, but
 * built from {@link DataProvider.listPublicProjects} instead of the full
 * `Project`/risk pipeline, so `CitizenMpStat` carries no risk fields
 * (`risk`, `flaggedShare`, `avgRiskScore`) at all — not stripped in the UI,
 * never computed in the first place. `recommended`/`completed` are derived
 * from `status` (the only lifecycle signal `PublicProject` carries), which is
 * a close but not identical proxy for the authority side's
 * `seenInRecommended`/`seenInCompleted` ingestion flags — same approximation
 * already used by the Transparency Overview.
 */

export interface CitizenMpStat {
  /** Stable key — the trimmed MP name. */
  id: string;
  mpName: string;
  /** Most frequent house across the MP's works. */
  house: ProjectHouse | null;
  constituency: string | null;
  state: string | null;

  works: number;
  recommended: number;
  completed: number;
  /** completed ÷ recommended, or null when the MP has no recommended works. */
  completionRate: number | null;

  estimatedCost: Money;
  recordedPayments: Money;
  /** Σ recorded ÷ Σ estimated when Σ estimated > 0. */
  paymentsToEstimateRatio: number | null;

  /** Official MPLADS allocated limit (rupees), or null when the MP isn't on the official list. */
  allocated: number | null;
  /** Σ estimated ÷ allocated; null when unmatched or no estimate. */
  fundUtilisation: number | null;
}

export interface CitizenMpComparisonData {
  /** Every MP with at least one public work, sorted by work count desc then name. */
  mps: CitizenMpStat[];
}

export interface CitizenMpComparisonService {
  load(signal?: AbortSignal): Promise<CitizenMpComparisonData>;
}

export function createCitizenMpComparisonService(provider: DataProvider): CitizenMpComparisonService {
  return {
    async load(signal) {
      const projects = await provider.listPublicProjects(signal);
      return { mps: aggregateCitizenMps(projects) };
    },
  };
}

interface Acc {
  mpName: string;
  houses: Map<ProjectHouse, number>;
  constituency: string | null;
  state: string | null;
  works: number;
  recommended: number;
  completed: number;
  estimated: number;
  paid: number;
  currency: string;
}

export function aggregateCitizenMps(projects: PublicProject[]): CitizenMpStat[] {
  const byMp = new Map<string, Acc>();

  for (const project of projects) {
    const name = project.memberOfParliament?.trim();
    if (!name) continue;

    let acc = byMp.get(name);
    if (!acc) {
      acc = {
        mpName: name,
        houses: new Map(),
        constituency: project.constituency ?? null,
        state: project.state ?? null,
        works: 0,
        recommended: 0,
        completed: 0,
        estimated: 0,
        paid: 0,
        currency: project.estimatedCost?.currency ?? project.recordedPayments?.currency ?? 'INR',
      };
      byMp.set(name, acc);
    }

    acc.works += 1;
    if (project.status === 'RECOMMENDED' || project.status === 'RECOMMENDED_AND_COMPLETED') {
      acc.recommended += 1;
    }
    if (project.status === 'COMPLETED' || project.status === 'RECOMMENDED_AND_COMPLETED') {
      acc.completed += 1;
    }
    acc.estimated += project.estimatedCost?.amount ?? 0;
    acc.paid += project.recordedPayments?.amount ?? 0;
    acc.constituency ??= project.constituency ?? null;
    acc.state ??= project.state ?? null;
    if (project.house) acc.houses.set(project.house, (acc.houses.get(project.house) ?? 0) + 1);
  }

  return [...byMp.values()]
    .map((acc): CitizenMpStat => {
      const topHouse = [...acc.houses.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const allocation = lookupAllocation(acc.mpName, acc.state);
      const allocated = allocation ? allocation.allocated : null;
      return {
        id: acc.mpName,
        mpName: acc.mpName,
        house: topHouse,
        constituency: acc.constituency,
        state: acc.state,
        works: acc.works,
        recommended: acc.recommended,
        completed: acc.completed,
        completionRate: acc.recommended > 0 ? acc.completed / acc.recommended : null,
        estimatedCost: { amount: acc.estimated, currency: acc.currency },
        recordedPayments: { amount: acc.paid, currency: acc.currency },
        paymentsToEstimateRatio: acc.estimated > 0 ? acc.paid / acc.estimated : null,
        allocated,
        fundUtilisation: allocated && acc.estimated > 0 ? acc.estimated / allocated : null,
      };
    })
    .sort((a, b) => b.works - a.works || a.mpName.localeCompare(b.mpName));
}
