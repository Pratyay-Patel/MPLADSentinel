import type { DashboardData } from '../../../data';
import { MetricCard, SectionHeader } from '../../../ui';
import {
  CircleCheckIcon,
  ClipboardListIcon,
  LayoutGridIcon,
  RupeeIcon,
} from '../../../ui/icons';
import { formatCount, formatINRCompact } from '../../../format';

/**
 * Section 1 — national monitoring metrics. Definitions are deliberately literal
 * about what the dataset represents (e.g. "Recorded Payments", not "Total
 * Expenditure").
 */
export function NationalOverview({ data }: { data: DashboardData }) {
  return (
    <section aria-label="National overview">
      <SectionHeader title="National overview" />
      <div className="ui-metric-grid">
        <MetricCard
          icon={<LayoutGridIcon />}
          label="Total works"
          value={formatCount(data.totalWorks)}
          hint="MPLADS works tracked"
          tone="info"
        />
        <MetricCard
          icon={<ClipboardListIcon />}
          label="Recommended works"
          value={formatCount(data.recommendedWorks)}
          hint="Works at the recommended stage"
          tone="warning"
        />
        <MetricCard
          icon={<CircleCheckIcon />}
          label="Completed works"
          value={formatCount(data.completedWorks)}
          hint="Works at the completed stage"
          tone="success"
        />
        <MetricCard
          icon={<RupeeIcon />}
          label="Recorded payments"
          value={formatINRCompact(data.recordedPayments)}
          hint="Total recorded vendor payments"
        />
      </div>
    </section>
  );
}
