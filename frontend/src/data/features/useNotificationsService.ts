import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createNotificationsService, type NotificationsService } from './notifications';

/** Returns a {@link NotificationsService} bound to the active DataProvider. */
export function useNotificationsService(): NotificationsService {
  const provider = useDataProvider();
  return useMemo(() => createNotificationsService(provider), [provider]);
}
