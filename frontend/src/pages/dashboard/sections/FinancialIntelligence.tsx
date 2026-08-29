import type { DashboardData } from '../../../data';
import { BarList, Card, SectionHeader } from '../../../ui';
import { formatINRCompact, formatPercent } from '../../../format';

/**
 * Section 3 — Financial Intelligence. Communicates the estimated-cost vs
 * recorded-payments relationship for the current dataset only. "Recorded
 * payments" — never a claim about total scheme expenditure.
 */
export function FinancialIntelligence({ data }: { data: DashboardData }) {
  const estimated = data.summary.totalEstimatedCost.amount;
  const recorded = data.recordedPayments.amount;
  const ratio = estimated > 0 ? recorded / estimated : null;

  return (
    <Card>
      <SectionHeader
        title="Financial intelligence"
        description="Estimated cost and successfully recorded payments across the current dataset."
      />
      <BarList
        caption="Estimated cost versus recorded payments"
        items={[
          {
            label: 'Estimated cost (total)',
            value: estimated,
            valueLabel: formatINRCompact(data.summary.totalEstimatedCost),
            tone: 'brand',
          },
          {
            label: 'Recorded payments',
            value: recorded,
            valueLabel: formatINRCompact(data.recordedPayments),
            tone: 'success',
          },
        ]}
      />
      <p className="dash-note">
        {ratio == null
          ? 'No estimated-cost total is available for comparison.'
          : `Recorded payments represent about ${formatPercent(ratio)} of the estimated cost total ` +
            'for works in this dataset. Recorded payments reflect only payment records that were ' +
            'successfully retrieved — not every rupee spent under the scheme.'}
      </p>
    </Card>
  );
}
