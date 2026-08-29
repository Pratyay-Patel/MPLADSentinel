import { useId, type InputHTMLAttributes } from 'react';

import { SearchIcon } from './icons';

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'type' | 'onChange'
> {
  label: string;
  hideLabel?: boolean;
  /** Convenience: receives the current string value. */
  onValueChange?: (value: string) => void;
}

/** A search field with a leading icon. Debouncing / querying is a screen concern. */
export function SearchInput({
  label,
  hideLabel = true,
  onValueChange,
  className,
  ...rest
}: SearchInputProps) {
  const id = useId();
  return (
    <div className="ui-field">
      <label className={hideLabel ? 'visually-hidden' : 'ui-field__label'} htmlFor={id}>
        {label}
      </label>
      <div className="ui-search">
        <span className="ui-search__icon">
          <SearchIcon />
        </span>
        <input
          id={id}
          type="search"
          className={['ui-control', className].filter(Boolean).join(' ')}
          onChange={(event) => onValueChange?.(event.target.value)}
          {...rest}
        />
      </div>
    </div>
  );
}
