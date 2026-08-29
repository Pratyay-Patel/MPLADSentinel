import { useId, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'children'
> {
  label: string;
  hideLabel?: boolean;
  options: SelectOption[];
  hint?: string;
}

/** A labelled native `<select>` — the base for future filter controls. */
export function Select({ label, hideLabel, options, hint, className, ...rest }: SelectProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="ui-field">
      <label className={hideLabel ? 'visually-hidden' : 'ui-field__label'} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={['ui-control', className].filter(Boolean).join(' ')}
        aria-describedby={hintId}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <span id={hintId} className="ui-field__hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
