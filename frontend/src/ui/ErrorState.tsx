import type { ReactNode } from 'react';

import { Button } from './Button';
import { AlertTriangleIcon } from './icons';

export interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  /** When provided, shows a "Retry" button. */
  onRetry?: () => void;
  retryLabel?: string;
}

/** Shown when a provider operation fails. Announced via `role="alert"`. */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  return (
    <div className="ui-placeholder-block ui-error-block" role="alert">
      <span className="ui-placeholder-block__icon" aria-hidden>
        <AlertTriangleIcon width={22} height={22} />
      </span>
      <p className="ui-placeholder-block__title">{title}</p>
      {description ? <p className="ui-placeholder-block__desc">{description}</p> : null}
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
