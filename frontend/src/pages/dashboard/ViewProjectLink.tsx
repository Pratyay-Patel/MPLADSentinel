import { Link } from 'react-router-dom';

import type { Project } from '../../data';

/**
 * Action-column link to the project-detail placeholder route. The detail page
 * itself is a later phase; this only navigates.
 */
export function ViewProjectLink({ project }: { project: Project }) {
  const label = project.workDescription ?? `work ${project.sourceWorkId}`;
  return (
    <Link
      className="ui-btn ui-btn--ghost ui-btn--sm"
      to={`/projects/${project.sourceWorkId}`}
      aria-label={`View ${label}`}
    >
      View <span aria-hidden>→</span>
    </Link>
  );
}
