import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createAssistantService, type AssistantService } from './assistant';

/** Returns an {@link AssistantService} bound to the active DataProvider. */
export function useAssistantService(): AssistantService {
  const provider = useDataProvider();
  return useMemo(() => createAssistantService(provider), [provider]);
}
