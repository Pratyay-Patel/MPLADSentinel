import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional leading icon (decorative). */
  icon?: ReactNode;
}

/** Presentation-only button. No async / business behaviour. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = ['ui-btn', `ui-btn--${variant}`, size === 'sm' ? 'ui-btn--sm' : null, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </button>
  );
}
