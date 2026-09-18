import type { ReactNode } from 'react';

import type { StatusTone } from './StatusBadge';

export interface SectionHeaderProps {
  title: string;
  description?: ReactNode;
  /** Right-aligned actions (buttons, filters). */
  actions?: ReactNode;
  /** Heading level for correct document outline. Default 2. */
  as?: 'h2' | 'h3';
  /** Optional decorative leading icon (line icon from `ui/icons`). */
  icon?: ReactNode;
  /** Icon-chip accent, reusing the shared semantic tones. Defaults to the brand tint. */
  tone?: Extract<StatusTone, 'info' | 'success' | 'warning' | 'danger' | 'neutral'>;
}

export function SectionHeader({ title, description, actions, as = 'h2', icon, tone }: SectionHeaderProps) {
  const Heading = as;
  return (
    <div className="ui-section-header">
      <div className="ui-section-header__row">
        {icon && (
          <span className="ui-section-header__icon" data-tone={tone} aria-hidden>
            {icon}
          </span>
        )}
        <div>
          <Heading className="ui-section-header__title">{title}</Heading>
          {description ? <p className="ui-section-header__desc">{description}</p> : null}
        </div>
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}
