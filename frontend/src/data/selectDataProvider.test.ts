import { describe, expect, it } from 'vitest';

import { resolveDataSource, selectDataProvider } from './selectDataProvider';

describe('data-source selection', () => {
  it('defaults to demo when the value is unset, empty, or unrecognised', () => {
    expect(resolveDataSource(undefined)).toBe('demo');
    expect(resolveDataSource('')).toBe('demo');
    expect(resolveDataSource('API')).toBe('demo'); // exact match only
    expect(resolveDataSource('nonsense')).toBe('demo');
  });

  it('selects api only for the exact value "api"', () => {
    expect(resolveDataSource('api')).toBe('api');
  });

  it('builds a provider whose source matches the requested data source', () => {
    expect(selectDataProvider('demo').source).toBe('demo');
    expect(selectDataProvider('api').source).toBe('api');
  });
});
