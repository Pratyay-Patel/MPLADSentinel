import type { DataProvider } from '../DataProvider';
import { lookupAllocation } from '../mpAllocations';
import type { Money, Project, ProjectHouse, ProjectRisk, RiskLevel } from '../types';
import { loadProjectsWithRisk } from './projectsWithRisk';

/**
 * Feature service for "Compare MPs" (`/compare`).
 *
 * Aggregates every work by its `mpName` into per-MP totals, then joins the
 * official MPLADS allocated limit (`src/data/mpAllocations.ts`, from the MoSPI
 * eSAKSHI dashboard) by normalised name. `allocated` / `fundUtilisation` are
 * `null` for any MP not on the official list — never a guess.
 */

export interface MpStat {
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
  /** Σ recommended estimate ÷ allocated; null when unmatched or no estimate. */
  fundUtilisation: number | null;

  risk: Record<RiskLevel, number>;
  /** (HIGH + MEDIUM) ÷ assessed works, or null when nothing is assessed. */
  flaggedShare: number | null;
  /** Mean risk score over assessed works, or null. */
  avgRiskScore: number | null;
}

export interface MpComparisonData {
  /** Every MP with at least one work, sorted by work count desc then name. */
  mps: MpStat[];
}

export interface MpComparisonService {
  load(signal?: AbortSignal): Promise<MpComparisonData>;
}

export function createMpComparisonService(provider: DataProvider): MpComparisonService {
  return {
    async load(signal) {
      const { projects, risksByWorkId } = await loadProjectsWithRisk(provider, signal);
      return { mps: aggregateMps(projects, risksByWorkId) };
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
  risk: Record<RiskLevel, number>;
  scoreSum: number;
  scoreCount: number;
}

const ZERO_RISK = (): Record<RiskLevel, number> => ({ HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 });

export function aggregateMps(
  projects: Project[],
  risksByWorkId: Record<number, ProjectRisk>,
): MpStat[] {
  const byMp = new Map<string, Acc>();

  for (const project of projects) {
    const name = project.mpName?.trim();
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
        risk: ZERO_RISK(),
        scoreSum: 0,
        scoreCount: 0,
      };
      byMp.set(name, acc);
    }

    acc.works += 1;
    if (project.seenInRecommended) acc.recommended += 1;
    if (project.seenInCompleted) acc.completed += 1;
    acc.estimated += project.estimatedCost?.amount ?? 0;
    acc.paid += project.recordedPayments?.amount ?? 0;
    acc.constituency ??= project.constituency ?? null;
    acc.state ??= project.state ?? null;
    if (project.house) acc.houses.set(project.house, (acc.houses.get(project.house) ?? 0) + 1);

    const risk = risksByWorkId[project.sourceWorkId];
    const level = risk?.level ?? 'UNKNOWN';
    acc.risk[level] += 1;
    if (risk && risk.score != null) {
      acc.scoreSum += risk.score;
      acc.scoreCount += 1;
    }
  }

  return [...byMp.values()]
    .map((acc): MpStat => {
      const assessed = acc.works - acc.risk.UNKNOWN;
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
        risk: acc.risk,
        flaggedShare: assessed > 0 ? (acc.risk.HIGH + acc.risk.MEDIUM) / assessed : null,
        avgRiskScore: acc.scoreCount > 0 ? acc.scoreSum / acc.scoreCount : null,
      };
    })
    .sort((a, b) => b.works - a.works || a.mpName.localeCompare(b.mpName));
}
