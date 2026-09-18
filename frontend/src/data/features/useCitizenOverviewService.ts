import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createCitizenOverviewService, type CitizenOverviewService } from './citizenOverview';

/** Returns a {@link CitizenOverviewService} bound to the active DataProvider. */
export function useCitizenOverviewService(): CitizenOverviewService {
  const provider = useDataProvider();
  return useMemo(() => createCitizenOverviewService(provider), [provider]);
}
