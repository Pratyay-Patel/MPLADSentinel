import { createContext, useContext } from 'react';

import type { DataProvider } from './DataProvider';

/**
 * Holds the active {@link DataProvider}. Populated by
 * {@link ./DataProviderProvider#DataProviderProvider}; read via
 * {@link useDataProvider}. Components never import a concrete provider or the API
 * client directly.
 */
export const DataProviderContext = createContext<DataProvider | null>(null);

export function useDataProvider(): DataProvider {
  const provider = useContext(DataProviderContext);
  if (!provider) {
    throw new Error('useDataProvider must be used within a <DataProviderProvider>.');
  }
  return provider;
}
