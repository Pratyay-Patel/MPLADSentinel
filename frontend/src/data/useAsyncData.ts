import { useEffect, useState } from 'react';

import type { AsyncState } from './asyncState';
import { toProviderError } from './errors';

interface UseAsyncDataOptions<T> {
  /** When it returns true for a resolved value, the state is `empty` instead of `success`. */
  isEmpty?: (data: T) => boolean;
}

/**
 * Runs a provider operation and exposes it as a {@link AsyncState}:
 * `loading` → (`success` | `empty` | `error`). Re-runs when `deps` change and
 * aborts the in-flight call on unmount / dep change.
 *
 * Deliberately tiny — this is the whole data-fetching "framework". Screens that
 * later need caching or revalidation can layer it on without changing this
 * contract.
 */
export function useAsyncData<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  options: UseAsyncDataOptions<T> = {},
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const { isEmpty } = options;

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    loader(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setState(isEmpty?.(data) ? { status: 'empty' } : { status: 'success', data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error: toProviderError(error) });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
