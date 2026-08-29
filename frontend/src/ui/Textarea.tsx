import { useId, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
}

/** A labelled multi-line text input. Mirrors {@link ./Input#Input}. */
export function Textarea({
  label,
  hideLabel,
  hint,
  error,
  className,
  rows = 4,
  ...rest
}: TextareaProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="ui-field">
      <label className={hideLabel ? 'visually-hidden' : 'ui-field__label'} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        className={['ui-control', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...rest}
      />
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
