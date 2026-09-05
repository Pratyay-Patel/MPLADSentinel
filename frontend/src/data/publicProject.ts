import type { LifecycleState, Money, Project, ProjectHouse } from './types';

/**
 * The publicly releasable view of an MPLADS work — the only project shape a
 * citizen ever receives.
 *
 * It deliberately does not carry risk scores, data-quality flags,
 * payment-retrieval internals or source-provenance framing. In `api` mode this
 * is enforced server-side (`GET /api/public/works` returns only these fields);
 * in `demo` mode {@link toPublicProject} narrows a `Project` to the same shape.
 * A component cannot leak what it never receives.
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

/** Narrows a full {@link Project} to the publicly releasable {@link PublicProject}. */
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
