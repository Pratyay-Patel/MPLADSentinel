import { useMemo } from 'react';

import { useDataProvider } from '../context';
import { createEscrowService, type EscrowService } from './escrow';

/** Returns an {@link EscrowService} bound to the active DataProvider. */
export function useEscrowService(): EscrowService {
  const provider = useDataProvider();
  return useMemo(() => createEscrowService(provider), [provider]);
}
