import type { DataProvider } from '../DataProvider';
import type { Project, ProjectRisk } from '../types';

export interface ProjectsWithRisk {
  projects: Project[];
  /** Risk view model per `sourceWorkId`; always populated (`UNKNOWN` on a gap or failure). */
  risksByWorkId: Record<number, ProjectRisk>;
}

function unknownRisk(sourceWorkId: number): ProjectRisk {
  return { sourceWorkId, level: 'UNKNOWN', score: null, reasons: [], assessedAt: null };
}

/**
 * Loads every project plus its risk view model. `listProjects` and the bulk
 * `listProjectRisks` are fetched in parallel (one request each). A risk failure
 * degrades every work to `UNKNOWN` rather than failing the whole load; a
 * `listProjects` failure propagates. Shared by the dashboard, Risk & Alerts and
 * Project Register services.
 */
export async function loadProjectsWithRisk(
  provider: DataProvider,
  signal?: AbortSignal,
): Promise<ProjectsWithRisk> {
  const [projects, risksByWorkId] = await Promise.all([
    provider.listProjects(signal),
    provider
      .listProjectRisks(signal)
      .catch((): Record<number, ProjectRisk> => ({})),
  ]);

  for (const project of projects) {
    risksByWorkId[project.sourceWorkId] ??= unknownRisk(project.sourceWorkId);
  }

  return { projects, risksByWorkId };
}
