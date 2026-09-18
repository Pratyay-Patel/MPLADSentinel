import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createCitizenMpComparisonService, type CitizenMpComparisonService } from './citizenMpComparison';

/** Returns a {@link CitizenMpComparisonService} bound to the active DataProvider. */
export function useCitizenMpComparisonService(): CitizenMpComparisonService {
  const provider = useDataProvider();
  return useMemo(() => createCitizenMpComparisonService(provider), [provider]);
}
