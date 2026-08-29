import type { DashboardData } from '../../../data';
import { MetricCard } from '../../../ui';
import { formatCount, formatINRCompact } from '../format';

/**
 * Section 1 — national monitoring metrics. Definitions are deliberately literal
 * about what the dataset represents (e.g. "Recorded Payments", not "Total
 * Expenditure").
 */
export function NationalOverview({ data }: { data: DashboardData }) {
  return (
    <section aria-labelledby="dash-overview-heading">
      <h2 id="dash-overview-heading" className="dash-section-title">
        National overview
      </h2>
      <div className="ui-metric-grid">
        <MetricCard
          label="Total works"
          value={formatCount(data.totalWorks)}
          hint="Normalised work records in the dataset"
        />
        <MetricCard
          label="Recommended works"
          value={formatCount(data.recommendedWorks)}
          hint="Records seen in the recommended listing"
        />
        <MetricCard
          label="Completed works"
          value={formatCount(data.completedWorks)}
          hint="Records seen in the completed listing"
        />
        <MetricCard
          label="Recorded payments"
          value={formatINRCompact(data.recordedPayments)}
          hint="Total of successfully retrieved payment records"
        />
      </div>
    </section>
  );
}
