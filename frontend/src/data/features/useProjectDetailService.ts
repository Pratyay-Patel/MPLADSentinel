import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createProjectDetailService, type ProjectDetailService } from './projectDetail';

/** Returns a {@link ProjectDetailService} bound to the active DataProvider. */
export function useProjectDetailService(): ProjectDetailService {
  const provider = useDataProvider();
  return useMemo(() => createProjectDetailService(provider), [provider]);
}
