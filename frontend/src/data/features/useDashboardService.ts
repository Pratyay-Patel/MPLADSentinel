import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createDashboardService, type DashboardService } from './dashboard';

/** Returns a {@link DashboardService} bound to the active DataProvider. */
export function useDashboardService(): DashboardService {
  const provider = useDataProvider();
  return useMemo(() => createDashboardService(provider), [provider]);
}
