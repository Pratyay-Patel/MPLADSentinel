import { hasReadableDescription, workTitle } from '../../format';
import type { DataProvider } from '../DataProvider';
import type { PublicProject } from '../publicProject';
import type { PaymentInstallment } from '../types';

/**
 * Feature service for the Citizen Portal (`/citizen`) — a read-only, public view
 * of MPLADS works.
 *
 * The portal must only ever show **publicly releasable** information. That is
 * enforced at the data boundary, not in components: the provider returns
 * {@link PublicProject} values (server-narrowed via `GET /api/public/works` in
 * `api` mode, {@link toPublicProject}-narrowed in `demo` mode) that simply do
 * not carry risk scores, data-quality flags, payment internals or provenance.
 * This service only sorts and derives filter options.
 */
export type { PublicProject } from '../publicProject';
export { toPublicProject } from '../publicProject';

export interface CitizenListData {
  projects: PublicProject[];
  filterOptions: { states: string[]; categories: string[] };
}

export interface CitizenService {
  list(signal?: AbortSignal): Promise<CitizenListData>;
  get(reference: number, signal?: AbortSignal): Promise<PublicProject | null>;
  /** Recorded payment installments for one work — same public expenditure data
   *  as the authority Payments section, no risk/internal fields either way. */
  getPayments(reference: number, signal?: AbortSignal): Promise<PaymentInstallment[]>;
}

function uniqSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

export function createCitizenService(provider: DataProvider): CitizenService {
  return {
    async list(signal) {
      const projects = (await provider.listPublicProjects(signal)).sort(
        (a, b) =>
          Number(!hasReadableDescription(a.workDescription)) -
            Number(!hasReadableDescription(b.workDescription)) ||
          workTitle(a.workDescription, a.reference).localeCompare(
            workTitle(b.workDescription, b.reference),
          ) ||
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
    get(reference, signal) {
      return provider.getPublicProject(reference, signal);
    },
    getPayments(reference, signal) {
      return provider.getPublicProjectPayments(reference, signal);
    },
  };
}
