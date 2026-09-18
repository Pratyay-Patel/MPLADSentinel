import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createCitizenAnalyticsService, type CitizenAnalyticsService } from './citizenAnalytics';

/** Returns a {@link CitizenAnalyticsService} bound to the active DataProvider. */
export function useCitizenAnalyticsService(): CitizenAnalyticsService {
  const provider = useDataProvider();
  return useMemo(() => createCitizenAnalyticsService(provider), [provider]);
}
