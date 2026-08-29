/**
 * The single error type every DataProvider method rejects with, so screens can
 * branch on `kind` instead of sniffing arbitrary errors.
 */

export type ProviderErrorKind =
  /** The backend endpoint for this operation does not exist yet (a later phase). */
  | 'notImplemented'
  /** The backend responded, but with an error status. */
  | 'unavailable'
  /** The request never reached the backend (offline / DNS / CORS). */
  | 'network'
  /** Anything else. */
  | 'unknown';

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;

  constructor(kind: ProviderErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProviderError';
    this.kind = kind;
  }
}

/** Normalise any thrown value into a {@link ProviderError}. */
export function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }
  if (error instanceof Error) {
    return new ProviderError('unknown', error.message, { cause: error });
  }
  return new ProviderError('unknown', 'Unknown provider error', { cause: error });
}
