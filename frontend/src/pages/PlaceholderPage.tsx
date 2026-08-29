import type { ReactNode } from 'react';

import { Card, PageHeader, type Breadcrumb } from '../ui';

export interface PlaceholderPageProps {
  title: string;
  description: string;
  breadcrumbs?: Breadcrumb[];
  /** Extra context lines, e.g. which feature phase owns this screen. */
  note?: ReactNode;
}

/**
 * A neutral "not built yet" screen for a routed feature. It carries NO mock
 * dashboard / business content — the real screen is implemented in its own
 * phase and will read data only through the feature-service / DataProvider seam.
 */
export function PlaceholderPage({ title, description, breadcrumbs, note }: PlaceholderPageProps) {
  return (
    <div className="ui-stack">
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      <Card>
        <p>
          This screen is part of the Round-1 web portal and will be implemented in a later phase.
        </p>
        <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
          It will read data through the feature-service / DataProvider layer established in Phase
          3A-1 — never by calling an API or importing demo fixtures directly.
        </p>
        {note ? (
          <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
            {note}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
