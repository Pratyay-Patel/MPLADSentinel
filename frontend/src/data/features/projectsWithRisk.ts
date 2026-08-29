import type { DataProvider } from '../DataProvider';
import { ProviderError } from '../errors';
import type { Project, ProjectRisk } from '../types';

export interface ProjectsWithRisk {
  projects: Project[];
  /** Risk view model per `sourceWorkId`; always populated (`UNKNOWN` on failure). */
  risksByWorkId: Record<number, ProjectRisk>;
}

function unknownRisk(sourceWorkId: number): ProjectRisk {
  return { sourceWorkId, level: 'UNKNOWN', score: null, reasons: [], assessedAt: null };
}

function allUnknown(projects: Project[]): Record<number, ProjectRisk> {
  const out: Record<number, ProjectRisk> = {};
  for (const project of projects) {
    out[project.sourceWorkId] = unknownRisk(project.sourceWorkId);
  }
  return out;
}

/**
 * Loads every project plus its risk view model. A per-project risk failure
 * degrades to `UNKNOWN` rather than failing the whole load; a `listProjects`
 * failure propagates. Shared by the dashboard and Risk & Alerts services.
 *
 * The risk endpoint is probed once: if the provider has no risk implementation
 * yet (pre-B3 `ApiDataProvider` → `notImplemented`), every work is marked
 * `UNKNOWN` in one pass instead of firing one rejected call per work — which,
 * over thousands of works, is pure overhead.
 */
export async function loadProjectsWithRisk(
  provider: DataProvider,
  signal?: AbortSignal,
): Promise<ProjectsWithRisk> {
  const projects = await provider.listProjects(signal);
  if (projects.length === 0) {
    return { projects, risksByWorkId: {} };
  }

  const [head, ...rest] = projects;
  const risksByWorkId: Record<number, ProjectRisk> = {};

  try {
    const first = await provider.getProjectRisk(head.sourceWorkId, signal);
    risksByWorkId[head.sourceWorkId] = first ?? unknownRisk(head.sourceWorkId);
  } catch (error) {
    if (error instanceof ProviderError && error.kind === 'notImplemented') {
      return { projects, risksByWorkId: allUnknown(projects) };
    }
    risksByWorkId[head.sourceWorkId] = unknownRisk(head.sourceWorkId);
  }

  const results = await Promise.allSettled(
    rest.map((p) => provider.getProjectRisk(p.sourceWorkId, signal)),
  );
  rest.forEach((project, index) => {
    const result = results[index];
    risksByWorkId[project.sourceWorkId] =
      result.status === 'fulfilled' && result.value
        ? result.value
        : unknownRisk(project.sourceWorkId);
  });

  return { projects, risksByWorkId };
}
