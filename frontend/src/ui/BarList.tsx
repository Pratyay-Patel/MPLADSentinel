export interface BarListItem {
  /** Row label. */
  label: string;
  /** Numeric value that drives the bar length. */
  value: number;
  /** Text shown at the end of the row (defaults to `value`). */
  valueLabel?: string;
  /** Optional semantic tint for the bar. */
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

export interface BarListProps {
  items: BarListItem[];
  /** Accessible group label describing what the bars represent. */
  caption: string;
  /** Fixed maximum for the scale; defaults to the largest value. */
  max?: number;
}

/**
 * A compact horizontal bar comparison — no charting dependency. The label and
 * value text carry the data (screen-reader accessible); the bar itself is a
 * decorative visual aid. Used for Work Distribution, Financial Intelligence and
 * Top States on the dashboard.
 */
export function BarList({ items, caption, max }: BarListProps) {
  const scale = Math.max(max ?? 0, ...items.map((item) => item.value), 1);

  return (
    <div className="ui-barlist" role="group" aria-label={caption}>
      {items.map((item) => {
        const pct = Math.max(0, Math.min(100, (item.value / scale) * 100));
        return (
          <div className="ui-barlist__row" key={item.label}>
            <span className="ui-barlist__label">{item.label}</span>
            <span className="ui-barlist__track" aria-hidden>
              <span
                className="ui-barlist__fill"
                data-tone={item.tone ?? 'brand'}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="ui-barlist__value">{item.valueLabel ?? item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
