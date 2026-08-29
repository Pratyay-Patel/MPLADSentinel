import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Apply default inner padding. Default `true`. */
  padded?: boolean;
  /** Render as a `<section>` (default) or `<div>`. */
  as?: 'section' | 'div';
}

/** A plain surface container. Compose with SectionHeader / other primitives. */
export function Card({ padded = true, as = 'section', className, children, ...rest }: CardProps) {
  const Tag = as;
  const classes = ['ui-card', padded ? 'ui-card--pad' : null, className].filter(Boolean).join(' ');
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
