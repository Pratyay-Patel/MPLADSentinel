import type { ReactNode } from 'react';

/** Semantic states shared across the portal. */
export type StatusTone = 'normal' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  /**
   * Screen-reader prefix so the tone is announced, not just shown by colour
   * (e.g. "Status: High risk"). Defaults to "Status".
   */
  srLabel?: string;
}

/** Non-decorative status glyphs — colour is never the only signal. */
const GLYPH: Record<StatusTone, string> = {
  normal: '●',
  success: '✓',
  warning: '!',
  danger: '▲',
  info: 'i',
  neutral: '–',
};

/**
 * A labelled status pill. The visible label text plus a shape glyph convey the
 * state without relying on colour.
 */
export function StatusBadge({ tone, children, srLabel = 'Status' }: StatusBadgeProps) {
  return (
    <span className="ui-status" data-status={tone}>
      <span className="ui-status__glyph" aria-hidden>
        {GLYPH[tone]}
      </span>
      <span className="visually-hidden">{srLabel}: </span>
      {children}
    </span>
  );
}
