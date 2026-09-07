import { Card, PageHeader } from '../../ui';

/**
 * Fund & Utilisation Analytics (`/analytics`).
 *
 * Dedicated analytics surface so the Overview stays single-purpose. Charts —
 * states by fund utilisation, utilisation-pattern buckets, a KPI strip and
 * data-derived observations — are built in roadmap step 2 (see
 * docs/frontend-visual-redesign-roadmap.md §9.3). Data will come through a new
 * `data/features/analytics.ts` aggregator over the DataProvider seam.
 */
export function AnalyticsPage() {
  return (
    <div className="ui-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Analytics' }]}
        title="Fund & Utilisation Analytics"
        description="Sanction, disbursement and utilisation patterns across states, constituencies and Members of Parliament."
      />
      <Card>
        <p className="text-muted">Utilisation charts are being finalised for this view.</p>
      </Card>
    </div>
  );
}
