import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { FilterContext } from './context';
import {
  EMPTY_GLOBAL_FILTERS,
  globalFiltersActive,
  globalFiltersFromParams,
  writeGlobalFiltersToParams,
  type GlobalFilters,
} from './globalFilters';

/**
 * Holds the app-wide filter set (year / state / district / status). The URL
 * query string is the source of truth so a filtered view is shareable and
 * survives a reload; on navigation between screens (sidebar links don't carry
 * the query string) the last chosen set is re-applied to the new URL, which is
 * what makes the bar feel "global".
 */
export function FilterProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const filters = useMemo(() => globalFiltersFromParams(searchParams), [searchParams]);

  // The last filter set the user explicitly chose, re-asserted after a route
  // change so it carries across screens. `clear()` resets it to empty.
  const lastChosen = useRef<GlobalFilters>(filters);

  const setFilters = useCallback(
    (next: GlobalFilters) => {
      lastChosen.current = next;
      setSearchParams((prev) => writeGlobalFiltersToParams(prev, next), { replace: true });
    },
    [setSearchParams],
  );

  const clear = useCallback(() => setFilters(EMPTY_GLOBAL_FILTERS), [setFilters]);

  const prevPath = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;
    // A deep link that brought its own filters wins; otherwise re-apply the
    // last chosen set to this screen's URL.
    const urlHasFilters = globalFiltersActive(globalFiltersFromParams(searchParams));
    if (!urlHasFilters && globalFiltersActive(lastChosen.current)) {
      setSearchParams((prev) => writeGlobalFiltersToParams(prev, lastChosen.current), {
        replace: true,
      });
    }
  }, [location.pathname, searchParams, setSearchParams]);

  const value = useMemo(() => ({ filters, setFilters, clear }), [filters, setFilters, clear]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
