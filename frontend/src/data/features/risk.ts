import type { DataProvider } from '../DataProvider';
import type { Project, ProjectRisk, RiskLevel } from '../types';
import { loadProjectsWithRisk } from './projectsWithRisk';

/**
 * Feature-level service for the Risk & Alerts screen (`/risk`).
 *
 * Composes `listProjects` + per-project `getProjectRisk` (via the shared
 * {@link loadProjectsWithRisk}) into a flat, score-sorted list plus per-level
 * counts. The screen never touches a provider or the demo fixtures directly.
 */
export interface RiskRow {
  project: Project;
  risk: ProjectRisk;
}

export interface RiskListData {
  rows: RiskRow[];
  countsByLevel: Record<RiskLevel, number>;
}

export interface RiskService {
  load(signal?: AbortSignal): Promise<RiskListData>;
}

const LEVEL_ORDER: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, UNKNOWN: 3 };

export function createRiskService(provider: DataProvider): RiskService {
  return {
    async load(signal) {
      const { projects, risksByWorkId } = await loadProjectsWithRisk(provider, signal);

      const rows: RiskRow[] = projects
        .map((project) => ({ project, risk: risksByWorkId[project.sourceWorkId] }))
        .sort((a, b) => {
          if (LEVEL_ORDER[a.risk.level] !== LEVEL_ORDER[b.risk.level]) {
            return LEVEL_ORDER[a.risk.level] - LEVEL_ORDER[b.risk.level];
          }
          return (b.risk.score ?? 0) - (a.risk.score ?? 0);
        });

      const countsByLevel: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
      for (const row of rows) {
        countsByLevel[row.risk.level] += 1;
      }

      return { rows, countsByLevel };
    },
  };
}
