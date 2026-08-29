import type { ReactNode } from 'react';

import { InboxIcon } from './icons';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** Optional icon override (decorative). */
  icon?: ReactNode;
  /** Optional call to action. */
  action?: ReactNode;
}

/** Shown when a successful load returns nothing. */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="ui-placeholder-block">
      <span className="ui-placeholder-block__icon" aria-hidden>
        {icon ?? <InboxIcon width={22} height={22} />}
      </span>
      <p className="ui-placeholder-block__title">{title}</p>
      {description ? <p className="ui-placeholder-block__desc">{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
