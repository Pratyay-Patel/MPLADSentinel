import type { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  className?: string;
}

/** Neutral pill for counts / tags. For status use {@link ./StatusBadge}. */
export function Badge({ children, className }: BadgeProps) {
  return <span className={['ui-badge', className].filter(Boolean).join(' ')}>{children}</span>;
}
