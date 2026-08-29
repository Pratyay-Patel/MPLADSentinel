import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createProjectRegisterService, type ProjectRegisterService } from './projectRegister';

/** Returns a {@link ProjectRegisterService} bound to the active DataProvider. */
export function useProjectRegisterService(): ProjectRegisterService {
  const provider = useDataProvider();
  return useMemo(() => createProjectRegisterService(provider), [provider]);
}
