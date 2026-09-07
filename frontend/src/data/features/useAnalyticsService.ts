import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createAnalyticsService, type AnalyticsService } from './analytics';

/** Returns an {@link AnalyticsService} bound to the active DataProvider. */
export function useAnalyticsService(): AnalyticsService {
  const provider = useDataProvider();
  return useMemo(() => createAnalyticsService(provider), [provider]);
}
