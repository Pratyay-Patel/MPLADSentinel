import type { DataProvider } from '../DataProvider';
import type { Project, ProjectRisk, ProjectSummary } from '../types';

/**
 * Feature-level service for the project/work screens (Government Dashboard,
 * Project Intelligence, Project Details, Risk & Alerts, …).
 *
 * Screens call a service like this — never a {@link DataProvider} or the API
 * client directly. Today it is a thin pass-through; it is the seam where
 * screen-specific composition and view-model mapping will live as screens are
 * built. Because it depends only on the injected `DataProvider`, swapping demo
 * ↔ api happens entirely below it and no screen changes.
 */
export interface ProjectsService {
  list(signal?: AbortSignal): Promise<Project[]>;
  get(sourceWorkId: number, signal?: AbortSignal): Promise<Project | null>;
  summary(signal?: AbortSignal): Promise<ProjectSummary>;
  risk(sourceWorkId: number, signal?: AbortSignal): Promise<ProjectRisk | null>;
}

export function createProjectsService(provider: DataProvider): ProjectsService {
  return {
    list: (signal) => provider.listProjects(signal),
    get: (sourceWorkId, signal) => provider.getProject(sourceWorkId, signal),
    summary: (signal) => provider.getProjectSummary(signal),
    risk: (sourceWorkId, signal) => provider.getProjectRisk(sourceWorkId, signal),
  };
}
