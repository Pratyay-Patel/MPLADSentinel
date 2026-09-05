import { useMemo } from 'react';

import { summarizeRiskFactors, type DashboardData } from '../../../data';
import { BarList, Card, DonutChart, RISK_LEVEL_COLOR, RISK_LEVEL_ORDER, SectionHeader } from '../../../ui';
import { formatCount } from '../../../format';

/**
 * Risk signals — two aggregates over the whole dataset:
 *  • how works split across the four assessed risk levels (donut), and
 *  • which rule-based factors are driving those flags (bar list).
 *
 * Both are computed from the risk view models already loaded for the dashboard;
 * no extra fetch. Rule-based indicators, not an ML score (decision D22).
 */
export function RiskSignals({ data }: { data: DashboardData }) {
  const risks = useMemo(() => Object.values(data.risksByWorkId), [data.risksByWorkId]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    for (const risk of risks) {
      counts[risk.level] = (counts[risk.level] ?? 0) + 1;
    }
    return counts;
  }, [risks]);

  const assessed = risks.length - levelCounts.UNKNOWN;
  const slices = RISK_LEVEL_ORDER.map((level) => ({
    label: `${level} risk`,
    value: levelCounts[level] ?? 0,
    color: RISK_LEVEL_COLOR[level],
  })).filter((slice) => slice.value > 0);

  const factors = useMemo(() => summarizeRiskFactors(risks), [risks]);

  return (
    <Card>
      <SectionHeader
        title="Risk signals"
        description="Distribution of works by assessed risk level, and the rule-based factors behind the flags. Indicators for review — not proof of wrongdoing."
      />
      <div className="risk-signals">
        <div className="risk-signals__donut">
          <DonutChart
            slices={slices}
            centerValue={formatCount(assessed)}
            centerCaption="works assessed"
            ariaLabel="Works by assessed risk level"
          />
        </div>
        <div className="risk-signals__factors">
          <h3 className="risk-signals__subtitle">Most common risk factors</h3>
          {factors.length === 0 ? (
            <p className="risk-signals__note">No risk factors flagged in the current dataset.</p>
          ) : (
            <BarList
              caption="How often each risk factor is flagged across all works"
              items={factors.map((factor) => ({
                label: factor.label,
                value: factor.count,
                valueLabel: formatCount(factor.count),
                tone: 'warning',
              }))}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
