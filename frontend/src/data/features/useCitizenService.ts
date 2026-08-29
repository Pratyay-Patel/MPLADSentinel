import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createCitizenService, type CitizenService } from './citizen';

/** Returns a {@link CitizenService} bound to the active DataProvider. */
export function useCitizenService(): CitizenService {
  const provider = useDataProvider();
  return useMemo(() => createCitizenService(provider), [provider]);
}
