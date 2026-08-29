import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createGrievancesService, type GrievancesService } from './grievances';

/** Returns a {@link GrievancesService} bound to the active DataProvider. */
export function useGrievancesService(): GrievancesService {
  const provider = useDataProvider();
  return useMemo(() => createGrievancesService(provider), [provider]);
}
