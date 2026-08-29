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
  error?: string;
}

/** A labelled native `<select>` — the base for future filter controls. */
export function Select({
  label,
  hideLabel,
  options,
  hint,
  error,
  className,
  ...rest
}: SelectProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="ui-field">
      <label className={hideLabel ? 'visually-hidden' : 'ui-field__label'} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={['ui-control', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
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
      {error ? (
        <span id={errorId} className="ui-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
