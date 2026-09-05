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
        <p>This section is coming soon.</p>
        {note ? (
          <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
            {note}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
