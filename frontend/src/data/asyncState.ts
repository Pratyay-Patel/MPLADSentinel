import type { ProviderError } from './errors';

/**
 * The four states any screen needs to render for a provider-backed operation.
 * `empty` is distinct from `success` so screens can show a dedicated empty state
 * without inspecting the payload shape themselves.
 */
export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; error: ProviderError }
  | { status: 'success'; data: T };
