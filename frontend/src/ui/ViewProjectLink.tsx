import { Link } from 'react-router-dom';

export interface ViewProjectLinkProps {
  /** Source work id — used to build `/projects/:id`. */
  id: number;
  /** Used for the accessible name (e.g. the work description). */
  label?: string;
}

/** Action-column link to a project's detail page. */
export function ViewProjectLink({ id, label }: ViewProjectLinkProps) {
  return (
    <Link
      className="ui-btn ui-btn--ghost ui-btn--sm"
      to={`/projects/${id}`}
      aria-label={`View ${label ?? `work ${id}`}`}
    >
      View <span aria-hidden>→</span>
    </Link>
  );
}
