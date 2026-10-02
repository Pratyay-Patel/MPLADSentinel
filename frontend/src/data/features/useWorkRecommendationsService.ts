import { useMemo } from 'react';

import { useDataProvider } from '../context';
import {
  createWorkRecommendationsService,
  type WorkRecommendationsService,
} from './workRecommendations';

/** Returns a {@link WorkRecommendationsService} bound to the active DataProvider. */
export function useWorkRecommendationsService(): WorkRecommendationsService {
  const provider = useDataProvider();
  return useMemo(() => createWorkRecommendationsService(provider), [provider]);
}
