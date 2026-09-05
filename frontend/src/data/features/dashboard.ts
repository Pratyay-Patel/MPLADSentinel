import type { DataProvider } from '../DataProvider';
import type { DataSource, Money, Project, ProjectRisk, ProjectSummary, RiskLevel } from '../types';
import { loadProjectsWithRisk } from './projectsWithRisk';

/**
 * Feature-level service for the Government / MoSPI Intelligence Dashboard.
 *
 * The dashboard component calls this — never a {@link DataProvider}, the API
 * client, or the demo fixtures directly. It composes the provider's primitives
 * (`listProjects`, `getProjectSummary`, `getProjectRisk`) into one dashboard
 * view model and derives the intelligence-first groupings (attention list, top
 * states, filter option lists). Swapping demo ↔ api happens entirely below.
 *
 * `riskLevel` / `riskReasons` come from {@link ProjectRisk} — a placeholder view
 * model until the risk API exists — kept separate from the source-of-truth
 * {@link Project} fields.
 */

/** One row of "Projects Requiring Attention". */
export interface AttentionItem {
  project: Project;
  risk: ProjectRisk;
}

export interface StateWorkCount {
  state: string;
  works: number;
}

/** Per-state roll-up for the map: work count and risk-level split. */
export interface RegionStat {
  state: string;
  works: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
}

/** Distinct values available for each dashboard filter, derived from the dataset. */
export interface DashboardFilterOptions {
  states: string[];
  districts: string[];
  houses: string[];
  categories: string[];
  years: number[];
}

export interface DashboardData {
  /** Which provider produced this (so the UI can show a "demo data" marker). */
  source: DataSource;
  summary: ProjectSummary;
  /** All projects, for the exploration table + client-side filtering. */
  projects: Project[];
  /** Risk view model per `sourceWorkId` (always populated; `UNKNOWN` when absent). */
  risksByWorkId: Record<number, ProjectRisk>;

  // --- national overview metrics ---
  totalWorks: number;
  recommendedWorks: number;
  completedWorks: number;
  recordedPayments: Money;

  // --- intelligence groupings ---
  attention: AttentionItem[];
  topStates: StateWorkCount[];
  /** Every state in the dataset, with its risk-level split (for the map). */
  regions: RegionStat[];
  filterOptions: DashboardFilterOptions;
}

export interface DashboardService {
  load(signal?: AbortSignal): Promise<DashboardData>;
}

const RISK_ORDER: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, UNKNOWN: 3 };
const ATTENTION_LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM'];
const ATTENTION_LIMIT = 6;
const TOP_STATES_LIMIT = 6;

export function createDashboardService(provider: DataProvider): DashboardService {
  return {
    async load(signal) {
      const [{ projects, risksByWorkId }, summary] = await Promise.all([
        loadProjectsWithRisk(provider, signal),
        provider.getProjectSummary(signal),
      ]);

      const attention = projects
        .filter((p) => ATTENTION_LEVELS.includes(risksByWorkId[p.sourceWorkId].level))
        .sort((a, b) => {
          const ra = risksByWorkId[a.sourceWorkId];
          const rb = risksByWorkId[b.sourceWorkId];
          if (RISK_ORDER[ra.level] !== RISK_ORDER[rb.level]) {
            return RISK_ORDER[ra.level] - RISK_ORDER[rb.level];
          }
          return (rb.score ?? 0) - (ra.score ?? 0);
        })
        .slice(0, ATTENTION_LIMIT)
        .map((project) => ({ project, risk: risksByWorkId[project.sourceWorkId] }));

      return {
        source: provider.source,
        summary,
        projects,
        risksByWorkId,
        totalWorks: projects.length,
        recommendedWorks: projects.filter((p) => p.seenInRecommended).length,
        completedWorks: projects.filter((p) => p.seenInCompleted).length,
        recordedPayments: summary.totalRecordedPayments,
        attention,
        topStates: topStatesByWorkCount(projects, TOP_STATES_LIMIT),
        regions: regionStats(projects, risksByWorkId),
        filterOptions: buildFilterOptions(projects),
      };
    },
  };
}

/** Group works by state and tally the risk-level split. Sorted by work count desc. */
export function regionStats(
  projects: Project[],
  risksByWorkId: Record<number, ProjectRisk>,
): RegionStat[] {
  const byState = new Map<string, RegionStat>();
  for (const project of projects) {
    const state = project.state?.trim();
    if (!state) continue;
    let stat = byState.get(state);
    if (!stat) {
      stat = { state, works: 0, high: 0, medium: 0, low: 0, unknown: 0 };
      byState.set(state, stat);
    }
    stat.works += 1;
    switch (risksByWorkId[project.sourceWorkId]?.level) {
      case 'HIGH':
        stat.high += 1;
        break;
      case 'MEDIUM':
        stat.medium += 1;
        break;
      case 'LOW':
        stat.low += 1;
        break;
      default:
        stat.unknown += 1;
    }
  }
  return [...byState.values()].sort((a, b) => b.works - a.works || a.state.localeCompare(b.state));
}

export function topStatesByWorkCount(projects: Project[], limit: number): StateWorkCount[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    const state = project.state ?? 'Unknown';
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([state, works]) => ({ state, works }))
    .sort((a, b) => b.works - a.works || a.state.localeCompare(b.state))
    .slice(0, limit);
}

export function buildFilterOptions(projects: Project[]): DashboardFilterOptions {
  const uniqueSorted = (values: (string | null | undefined)[]) =>
    [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));

  const years = [
    ...new Set(
      projects.flatMap((p) =>
        [p.recommendedYear, p.completionYear].filter((y): y is number => y != null),
      ),
    ),
  ].sort((a, b) => b - a);

  return {
    states: uniqueSorted(projects.map((p) => p.state)),
    districts: uniqueSorted(projects.map((p) => p.district)),
    houses: uniqueSorted(projects.map((p) => p.house)),
    categories: uniqueSorted(projects.map((p) => p.category)),
    years,
  };
}
