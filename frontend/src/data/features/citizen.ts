import type { DataProvider } from '../DataProvider';
import type { LifecycleState, Money, Project, ProjectHouse } from '../types';

/**
 * Feature service for the Citizen Portal (`/citizen`) — a read-only, public view
 * of MPLADS works.
 *
 * The portal must only ever show **publicly releasable** information. Rather than
 * trusting each component to omit the right fields, the service maps every
 * `Project` through {@link toPublicProject} into a narrowed {@link PublicProject}
 * that simply does not carry risk scores, data-quality flags, payment-retrieval
 * internals or source-provenance framing. A component cannot leak what it never
 * receives.
 *
 * Data still flows Project → DataProvider; swapping demo ↔ api changes nothing
 * here.
 */
export interface PublicProject {
  /** Source work id — used only to address the public detail route. Never shown as an official id. */
  reference: number;
  workDescription: string | null;
  category: string | null;
  state: string | null;
  district: string | null;
  location: string | null;
  house: ProjectHouse | null;
  lsTerm: number | null;
  memberOfParliament: string | null;
  constituency: string | null;
  estimatedCost: Money | null;
  finalCost: Money | null;
  status: LifecycleState;
  sourceStatus: string | null;
  expectedBeneficiaries: number | null;
  recommendedOn: string | null;
  recommendedYear: number | null;
  completedOn: string | null;
  completionYear: number | null;
}

export function toPublicProject(project: Project): PublicProject {
  return {
    reference: project.sourceWorkId,
    workDescription: project.workDescription,
    category: project.category,
    state: project.state,
    district: project.district,
    location: project.locationRaw,
    house: project.house,
    lsTerm: project.lsTerm,
    memberOfParliament: project.mpName,
    constituency: project.constituency,
    estimatedCost: project.estimatedCost,
    finalCost: project.finalCost,
    status: project.lifecycleState,
    sourceStatus: project.sourceStatusRaw,
    expectedBeneficiaries: project.expectedBeneficiaries,
    recommendedOn: project.recommendedOn,
    recommendedYear: project.recommendedYear,
    completedOn: project.completedOn,
    completionYear: project.completionYear,
  };
}

export interface CitizenListData {
  projects: PublicProject[];
  filterOptions: { states: string[]; categories: string[] };
}

export interface CitizenService {
  list(signal?: AbortSignal): Promise<CitizenListData>;
  get(reference: number, signal?: AbortSignal): Promise<PublicProject | null>;
}

function uniqSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

export function createCitizenService(provider: DataProvider): CitizenService {
  return {
    async list(signal) {
      const projects = (await provider.listProjects(signal))
        .map(toPublicProject)
        .sort(
          (a, b) =>
            (a.workDescription ?? '').localeCompare(b.workDescription ?? '') ||
            a.reference - b.reference,
        );
      return {
        projects,
        filterOptions: {
          states: uniqSorted(projects.map((p) => p.state)),
          categories: uniqSorted(projects.map((p) => p.category)),
        },
      };
    },
    async get(reference, signal) {
      const project = await provider.getProject(reference, signal);
      return project ? toPublicProject(project) : null;
    },
  };
}
