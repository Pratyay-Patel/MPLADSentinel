import { useEffect, useId, useRef, useState } from 'react';

import { ChevronDownIcon, DownloadIcon } from '../ui/icons';
import { EXPORT_SCOPE_LABEL, type ExportScope } from './workExport';

const SCOPES: ExportScope[] = ['all', 'completed', 'recommended'];

export interface ExportMenuProps {
  /** Called with the chosen scope; the screen builds + downloads the file. */
  onExport: (scope: ExportScope) => void;
  /** Rows currently in view (all-scope count), shown in the button. */
  count: number;
  disabled?: boolean;
}

/**
 * "Export ▾" split into All / Completed / Recommended, matching the scoped
 * download on comparable public MPLADS dashboards. Client-side only — it exports
 * exactly the rows the current filters produce.
 */
export function ExportMenu({ onExport, count, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (scope: ExportScope) => {
    setOpen(false);
    onExport(scope);
  };

  return (
    <div className="export-menu" ref={rootRef}>
      <button
        type="button"
        className="ui-btn ui-btn--secondary ui-btn--sm export-menu__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled || count === 0}
        onClick={() => setOpen((v) => !v)}
      >
        <DownloadIcon />
        <span>Export CSV</span>
        <ChevronDownIcon />
      </button>

      {open && (
        <ul className="export-menu__list" id={menuId} role="menu">
          {SCOPES.map((scope) => (
            <li key={scope} role="none">
              <button
                type="button"
                role="menuitem"
                className="export-menu__item"
                onClick={() => pick(scope)}
              >
                {EXPORT_SCOPE_LABEL[scope]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
