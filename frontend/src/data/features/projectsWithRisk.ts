import type { DataProvider } from '../DataProvider';
import type { Project, ProjectRisk } from '../types';

export interface ProjectsWithRisk {
  projects: Project[];
  /** Risk view model per `sourceWorkId`; always populated (`UNKNOWN` on failure). */
  risksByWorkId: Record<number, ProjectRisk>;
}

function unknownRisk(sourceWorkId: number): ProjectRisk {
  return { sourceWorkId, level: 'UNKNOWN', score: null, reasons: [], assessedAt: null };
}

/**
 * Loads every project plus its risk view model. A per-project risk failure
 * degrades to `UNKNOWN` rather than failing the whole load; a `listProjects`
 * failure propagates. Shared by the dashboard and Risk & Alerts services.
 */
export async function loadProjectsWithRisk(
  provider: DataProvider,
  signal?: AbortSignal,
): Promise<ProjectsWithRisk> {
  const projects = await provider.listProjects(signal);
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

  return { projects, risksByWorkId };
}
