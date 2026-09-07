import type { ReactNode } from 'react';

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
}

/** A single KPI tile. Presentation only — the caller supplies formatted values. */
export function MetricCard({ label, value, hint, aside, icon }: MetricCardProps) {
  return (
    <div className="ui-metric">
      <div className="ui-metric__head">
        {icon && (
          <span className="ui-metric__icon" aria-hidden>
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
