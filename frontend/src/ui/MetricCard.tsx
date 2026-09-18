import type { ReactNode } from 'react';

import type { StatusTone } from './StatusBadge';

export interface MetricCardProps {
  label: string;
  /** Pre-formatted value — this component does no number formatting. */
  value: ReactNode;
  /** Optional secondary line (e.g. "across 12 districts"). */
  hint?: ReactNode;
  /** Optional trailing slot, e.g. a StatusBadge. */
  aside?: ReactNode;
  /** Optional decorative leading icon (line icon from `ui/icons`). */
  icon?: ReactNode;
  /** Icon-chip accent, reusing the shared semantic tones. Defaults to the brand tint. */
  tone?: Extract<StatusTone, 'info' | 'success' | 'warning' | 'danger' | 'neutral'>;
}

/** A single KPI tile. Presentation only — the caller supplies formatted values. */
export function MetricCard({ label, value, hint, aside, icon, tone }: MetricCardProps) {
  return (
    <div className="ui-metric" data-tone={tone}>
      <div className="ui-metric__head">
        {icon && (
          <span className="ui-metric__icon" data-tone={tone} aria-hidden>
            {icon}
          </span>
        )}
        <div className="ui-metric__label">{label}</div>
      </div>
      <div className="ui-metric__value">{value}</div>
      {(hint || aside) && (
        <div className="ui-metric__hint">
          {hint}
          {aside}
        </div>
      )}
    </div>
  );
}
