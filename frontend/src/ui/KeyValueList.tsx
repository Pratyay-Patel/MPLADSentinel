import type { ReactNode } from 'react';

export interface KeyValueItem {
  label: string;
  value: ReactNode;
}

export interface KeyValueListProps {
  items: KeyValueItem[];
}

/**
 * A responsive definition list for record detail views. Renders semantic
 * `<dl>` / `<dt>` / `<dd>`; label column on the left on wide screens, stacked on
 * narrow.
 */
export function KeyValueList({ items }: KeyValueListProps) {
  return (
    <dl className="ui-kv">
      {items.map((item) => (
        <div className="ui-kv__row" key={item.label}>
          <dt className="ui-kv__key">{item.label}</dt>
          <dd className="ui-kv__val">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
