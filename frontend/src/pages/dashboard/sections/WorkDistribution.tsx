import type { DashboardData } from '../../../data';
import { BarList, Card, SectionHeader } from '../../../ui';
import { formatCount } from '../../../format';

/**
 * Section 4 — Work Distribution. How many records appear in the recommended vs
 * completed listings. NOT "project progress" — the source provides no
 * quantitative physical progress, and the two listings are not a guaranteed
 * sequential lifecycle.
 */
export function WorkDistribution({ data }: { data: DashboardData }) {
  return (
    <Card>
      <SectionHeader
        title="Work distribution"
        description="Records seen in each source listing. A work may appear in both."
      />
      <BarList
        caption="Recommended works versus completed works"
        items={[
          {
            label: 'Recommended works',
            value: data.recommendedWorks,
            valueLabel: formatCount(data.recommendedWorks),
            tone: 'brand',
          },
          {
            label: 'Completed works',
            value: data.completedWorks,
            valueLabel: formatCount(data.completedWorks),
            tone: 'neutral',
          },
        ]}
      />
      <p className="dash-note">
        Recommended and completed are two source listings, not a measured project lifecycle.
      </p>
    </Card>
  );
}
