import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createInspectionsService, type InspectionsService } from './inspections';

/** Returns an {@link InspectionsService} bound to the active DataProvider. */
export function useInspectionsService(): InspectionsService {
  const provider = useDataProvider();
  return useMemo(() => createInspectionsService(provider), [provider]);
}
