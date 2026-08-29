import type { DataProvider } from '../DataProvider';
import type { DataSource, Money, Project, ProjectRisk, ProjectSummary, RiskLevel } from '../types';

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
  filterOptions: DashboardFilterOptions;
}

export interface DashboardService {
  load(signal?: AbortSignal): Promise<DashboardData>;
}

const RISK_ORDER: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, UNKNOWN: 3 };
const ATTENTION_LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM'];
const ATTENTION_LIMIT = 6;
const TOP_STATES_LIMIT = 6;

function unknownRisk(sourceWorkId: number): ProjectRisk {
  return { sourceWorkId, level: 'UNKNOWN', score: null, reasons: [], assessedAt: null };
}

/** Payment-to-estimate ratio when both are known and estimate > 0, else null. */
export function paymentRatio(project: Project): number | null {
  const est = project.estimatedCost?.amount ?? 0;
  const paid = project.recordedPayments?.amount ?? null;
  if (paid == null || est <= 0) return null;
  return paid / est;
}

/** A concise headline for a risk badge, from the risk reasons. */
export function riskHeadline(risk: ProjectRisk): string {
  if (risk.level === 'UNKNOWN') return 'Not yet assessed';
  if (risk.reasons.length === 0) return 'Flagged for review';
  if (risk.reasons.length === 1) return risk.reasons[0];
  return `${risk.reasons.length} indicators detected`;
}

export function createDashboardService(provider: DataProvider): DashboardService {
  return {
    async load(signal) {
      const [projects, summary] = await Promise.all([
        provider.listProjects(signal),
        provider.getProjectSummary(signal),
      ]);

      const riskResults = await Promise.allSettled(
        projects.map((p) => provider.getProjectRisk(p.sourceWorkId, signal)),
      );
      const risksByWorkId: Record<number, ProjectRisk> = {};
      projects.forEach((project, index) => {
        const result = riskResults[index];
        risksByWorkId[project.sourceWorkId] =
          result.status === 'fulfilled' && result.value
            ? result.value
            : unknownRisk(project.sourceWorkId);
      });

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
        filterOptions: buildFilterOptions(projects),
      };
    },
  };
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
