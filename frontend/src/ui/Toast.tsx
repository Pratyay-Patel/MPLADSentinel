import { useEffect } from 'react';

import type { StatusTone } from './StatusBadge';

export interface ToastProps {
  message: string;
  tone?: Extract<StatusTone, 'success' | 'danger' | 'info'>;
  onDismiss: () => void;
  /** Milliseconds before auto-dismiss. Default 4000. */
  duration?: number;
}

/** A floating, auto-dismissing confirmation banner. One at a time per page. */
export function Toast({ message, tone = 'success', onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration, message]);

  return (
    <div className="ui-toast" data-tone={tone} role="status">
      {message}
    </div>
  );
}
