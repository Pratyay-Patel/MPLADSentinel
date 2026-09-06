import { createContext, useContext } from 'react';

import type { GlobalFilters } from './globalFilters';

export interface FilterContextValue {
  filters: GlobalFilters;
  setFilters: (next: GlobalFilters) => void;
  clear: () => void;
}

/**
 * Holds the app-wide filter set (year / state / district / status). Populated by
 * {@link ./FilterProvider#FilterProvider} from the URL query string; read via
 * {@link useGlobalFilters}.
 */
export const FilterContext = createContext<FilterContextValue | null>(null);

export function useGlobalFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useGlobalFilters must be used within a <FilterProvider>.');
  }
  return ctx;
}
