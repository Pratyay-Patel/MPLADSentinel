import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createAuditService, type AuditService } from './audit';

/** Returns an {@link AuditService} bound to the active DataProvider. */
export function useAuditService(): AuditService {
  const provider = useDataProvider();
  return useMemo(() => createAuditService(provider), [provider]);
}
