import { createApiDataProvider } from './api/ApiDataProvider';
import type { DataProvider } from './DataProvider';
import { createDemoDataProvider } from './demo/DemoDataProvider';
import type { DataSource } from './types';

/**
 * Data-source selection.
 *
 * Set `VITE_DATA_SOURCE` in `.env` (`demo` | `api`). The default is `demo` so the
 * frontend can be developed against the demo fixtures while backend APIs are
 * still being built. Selection is centralised here — no component reads the env
 * var.
 */
export function resolveDataSource(
  raw: string | undefined = import.meta.env.VITE_DATA_SOURCE,
): DataSource {
  return raw === 'api' ? 'api' : 'demo';
}

export function selectDataProvider(source: DataSource = resolveDataSource()): DataProvider {
  return source === 'api' ? createApiDataProvider() : createDemoDataProvider();
}
