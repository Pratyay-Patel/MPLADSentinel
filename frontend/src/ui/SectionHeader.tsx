import type { ReactNode } from 'react';

export interface SectionHeaderProps {
  title: string;
  description?: ReactNode;
  /** Right-aligned actions (buttons, filters). */
  actions?: ReactNode;
  /** Heading level for correct document outline. Default 2. */
  as?: 'h2' | 'h3';
}

export function SectionHeader({ title, description, actions, as = 'h2' }: SectionHeaderProps) {
  const Heading = as;
  return (
    <div className="ui-section-header">
      <div>
        <Heading className="ui-section-header__title">{title}</Heading>
        {description ? <p className="ui-section-header__desc">{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}
