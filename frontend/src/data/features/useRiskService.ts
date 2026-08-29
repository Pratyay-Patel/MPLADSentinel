import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createRiskService, type RiskService } from './risk';

/** Returns a {@link RiskService} bound to the active DataProvider. */
export function useRiskService(): RiskService {
  const provider = useDataProvider();
  return useMemo(() => createRiskService(provider), [provider]);
}
