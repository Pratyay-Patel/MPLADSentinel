import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProviderError } from '../errors';
import { createApiDataProvider } from './ApiDataProvider';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiDataProvider', () => {
  const provider = createApiDataProvider();

  it('identifies itself as the api source', () => {
    expect(provider.source).toBe('api');
  });

  it('serves getBackendHealth through the centralized API client', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ status: 'UP', service: 'mpladsentinel-backend', timestamp: 't' }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const health = await provider.getBackendHealth();

    expect(health).toEqual({ status: 'UP', service: 'mpladsentinel-backend' });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/health');
  });

  it('maps a backend error status to a ProviderError of kind "unavailable"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'down' }, { status: 503 })),
    );

    const error = await provider.getBackendHealth().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe('unavailable');
  });

  it('maps a transport failure to a ProviderError of kind "network"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    const error = await provider.getBackendHealth().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe('network');
  });

  it.each([
    ['listProjects', () => provider.listProjects()],
    ['getProject', () => provider.getProject(1)],
    ['getProjectSummary', () => provider.getProjectSummary()],
    ['getProjectRisk', () => provider.getProjectRisk(1)],
  ] as const)(
    'rejects %s with a notImplemented ProviderError (no backend endpoint yet)',
    async (_name, call) => {
      const error = await call().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).kind).toBe('notImplemented');
    },
  );
});
