import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProviderError } from './errors';
import { useAsyncData } from './useAsyncData';

describe('useAsyncData', () => {
  it('goes loading -> success and exposes the data', async () => {
    const { result } = renderHook(() => useAsyncData(async () => [1, 2, 3], []));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    if (result.current.status === 'success') {
      expect(result.current.data).toEqual([1, 2, 3]);
    }
  });

  it('reports "empty" when the isEmpty predicate matches the resolved value', async () => {
    const { result } = renderHook(() =>
      useAsyncData(async () => [] as number[], [], { isEmpty: (d) => d.length === 0 }),
    );

    await waitFor(() => expect(result.current.status).toBe('empty'));
  });

  it('surfaces a ProviderError, preserving its kind', async () => {
    const { result } = renderHook(() =>
      useAsyncData<never>(async () => {
        throw new ProviderError('unavailable', 'backend down');
      }, []),
    );

    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status === 'error') {
      expect(result.current.error).toBeInstanceOf(ProviderError);
      expect(result.current.error.kind).toBe('unavailable');
    }
  });

  it('normalises a non-ProviderError rejection into a ProviderError', async () => {
    const { result } = renderHook(() =>
      useAsyncData<never>(async () => {
        throw new TypeError('boom');
      }, []),
    );

    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status === 'error') {
      expect(result.current.error).toBeInstanceOf(ProviderError);
      expect(result.current.error.kind).toBe('unknown');
    }
  });
});
