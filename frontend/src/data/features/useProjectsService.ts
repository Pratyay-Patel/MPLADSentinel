import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createProjectsService, type ProjectsService } from './projects';

/** Returns a {@link ProjectsService} bound to the active DataProvider. */
export function useProjectsService(): ProjectsService {
  const provider = useDataProvider();
  return useMemo(() => createProjectsService(provider), [provider]);
}
