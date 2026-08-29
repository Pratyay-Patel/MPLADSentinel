import { useMemo, type ReactNode } from 'react';

import { DataProviderContext } from './context';
import type { DataProvider } from './DataProvider';
import { selectDataProvider } from './selectDataProvider';

interface DataProviderProviderProps {
  children: ReactNode;
  /**
   * Override the selected provider. Left unset in the app (the provider is chosen
   * from `VITE_DATA_SOURCE`); tests pass a stub here.
   */
  provider?: DataProvider;
}

/** Makes the active {@link DataProvider} available to the tree via context. */
export function DataProviderProvider({ children, provider }: DataProviderProviderProps) {
  const value = useMemo(() => provider ?? selectDataProvider(), [provider]);
  return <DataProviderContext.Provider value={value}>{children}</DataProviderContext.Provider>;
}
