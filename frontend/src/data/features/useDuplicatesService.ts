import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createDuplicatesService, type DuplicatesService } from './duplicates';

/** Returns a {@link DuplicatesService} bound to the active DataProvider. */
export function useDuplicatesService(): DuplicatesService {
  const provider = useDataProvider();
  return useMemo(() => createDuplicatesService(provider), [provider]);
}
