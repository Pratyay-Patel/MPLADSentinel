import { Link } from 'react-router-dom';

export interface ViewProjectLinkProps {
  /** Source work id — used to build `/projects/:id`. */
  id: number;
  /** Used for the accessible name (e.g. the work description). */
  label?: string;
  /**
   * `'detail'` (default) links to the full detail page including the risk
   * assessment section. `'record'` links to the same page with `?section=record`
   * so the detail page renders the plain record only — used from the Project
   * Register, where risk is already shown as a column and the deep-dive belongs
   * to Risk & Alerts.
   */
  variant?: 'detail' | 'record';
}

/** Action-column link to a project's detail page. */
export function ViewProjectLink({ id, label, variant = 'detail' }: ViewProjectLinkProps) {
  const to = variant === 'record' ? `/projects/${id}?section=record` : `/projects/${id}`;
  return (
    <Link
      className="ui-btn ui-btn--ghost ui-btn--sm"
      to={to}
      aria-label={`View ${label ?? `work ${id}`}`}
    >
      View <span aria-hidden>→</span>
    </Link>
  );
}
