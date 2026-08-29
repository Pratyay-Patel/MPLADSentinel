import type { ReactNode } from 'react';

export interface MetricCardProps {
  label: string;
  /** Pre-formatted value — this component does no number formatting. */
  value: ReactNode;
  /** Optional secondary line (e.g. "across 12 districts"). */
  hint?: ReactNode;
  /** Optional trailing slot, e.g. a StatusBadge. */
  aside?: ReactNode;
}

/** A single KPI tile. Presentation only — the caller supplies formatted values. */
export function MetricCard({ label, value, hint, aside }: MetricCardProps) {
  return (
    <div className="ui-metric">
      <div className="ui-metric__label">{label}</div>
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
