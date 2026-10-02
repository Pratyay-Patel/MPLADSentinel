import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createCitizenAssistantService, type CitizenAssistantService } from './citizenAssistant';

/** Returns a {@link CitizenAssistantService} bound to the active DataProvider. */
export function useCitizenAssistantService(): CitizenAssistantService {
  const provider = useDataProvider();
  return useMemo(() => createCitizenAssistantService(provider), [provider]);
}
