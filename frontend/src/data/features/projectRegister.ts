import { hasReadableDescription, workTitle } from '../../format';
import type { DataProvider } from '../DataProvider';
import type { LifecycleState, Project, ProjectHouse, ProjectRisk, RiskLevel } from '../types';
import { loadProjectsWithRisk } from './projectsWithRisk';

/**
 * Feature service for the Project Register screen (`/projects`) — the full,
 * searchable list of works, distinct from the dashboard's compact exploration
 * table. Composes `listProjects` + per-work risk (via the shared
 * {@link loadProjectsWithRisk}) and derives the filter option lists.
 *
 * All filtering happens client-side in the screen; there is no backend filter
 * endpoint and none is implied. When the real APIs land, only the injected
 * provider changes.
 */
export interface RegisterRow {
  project: Project;
  risk: ProjectRisk;
}

export interface RegisterFilterOptions {
  states: string[];
  districts: string[];
  houses: ProjectHouse[];
  categories: string[];
  lifecycleStates: LifecycleState[];
  riskLevels: RiskLevel[];
}

export interface ProjectRegisterData {
  /** Every work, sorted by description then id. */
  rows: RegisterRow[];
  filterOptions: RegisterFilterOptions;
}

export interface ProjectRegisterService {
  load(signal?: AbortSignal): Promise<ProjectRegisterData>;
}

const HOUSE_ORDER: ProjectHouse[] = ['LOK_SABHA', 'RAJYA_SABHA'];
const LIFECYCLE_ORDER: LifecycleState[] = ['RECOMMENDED', 'COMPLETED', 'RECOMMENDED_AND_COMPLETED'];
const RISK_ORDER: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

function uniqSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

function presentIn<T>(order: T[], present: ReadonlySet<unknown>): T[] {
  return order.filter((value) => present.has(value));
}

export function createProjectRegisterService(provider: DataProvider): ProjectRegisterService {
  return {
    async load(signal) {
      const { projects, risksByWorkId } = await loadProjectsWithRisk(provider, signal);

      const rows: RegisterRow[] = projects
        .map((project) => ({ project, risk: risksByWorkId[project.sourceWorkId] }))
        .sort(
          (a, b) =>
            Number(!hasReadableDescription(a.project.workDescription)) -
              Number(!hasReadableDescription(b.project.workDescription)) ||
            workTitle(a.project.workDescription, a.project.sourceWorkId).localeCompare(
              workTitle(b.project.workDescription, b.project.sourceWorkId),
            ) ||
            a.project.sourceWorkId - b.project.sourceWorkId,
        );

      const filterOptions: RegisterFilterOptions = {
        states: uniqSorted(projects.map((p) => p.state)),
        districts: uniqSorted(projects.map((p) => p.district)),
        houses: presentIn(HOUSE_ORDER, new Set(projects.map((p) => p.house))),
        categories: uniqSorted(projects.map((p) => p.category)),
        lifecycleStates: presentIn(LIFECYCLE_ORDER, new Set(projects.map((p) => p.lifecycleState))),
        riskLevels: presentIn(RISK_ORDER, new Set(rows.map((r) => r.risk.level))),
      };

      return { rows, filterOptions };
    },
  };
}
