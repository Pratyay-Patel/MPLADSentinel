import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface Breadcrumb {
  label: string;
  /** When set, the crumb is a link. The last crumb is normally plain text. */
  to?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  /** Right-aligned page actions. */
  actions?: ReactNode;
}

/** The title / breadcrumb region a page renders at the top of the content area. */
export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="ui-breadcrumb" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`}>
              {index > 0 ? (
                <span className="ui-breadcrumb__sep" aria-hidden>
                  {' / '}
                </span>
              ) : null}
              {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="ui-page-header__row">
        <div>
          <h1 className="ui-page-header__title">{title}</h1>
          {description ? (
            <p className="ui-page-header__desc text-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
