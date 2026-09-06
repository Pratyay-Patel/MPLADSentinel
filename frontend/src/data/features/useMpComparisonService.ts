import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createMpComparisonService, type MpComparisonService } from './mpComparison';

/** Returns an {@link MpComparisonService} bound to the active DataProvider. */
export function useMpComparisonService(): MpComparisonService {
  const provider = useDataProvider();
  return useMemo(() => createMpComparisonService(provider), [provider]);
}
