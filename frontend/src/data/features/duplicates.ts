import type { DataProvider } from '../DataProvider';
import type { DuplicatePair } from '../types';

/**
 * Feature-level service for the De-duplication of Works screen (`/duplicates`,
 * requirements F7, decision D35).
 *
 * Thin — the real work (grouping + scoring) lives behind
 * {@link DataProvider.listDuplicateWorks}, same seam as risk.
 */
export interface DuplicatesService {
  load(signal?: AbortSignal): Promise<DuplicatePair[]>;
}

export function createDuplicatesService(provider: DataProvider): DuplicatesService {
  return {
    load: (signal) => provider.listDuplicateWorks(signal),
  };
}
