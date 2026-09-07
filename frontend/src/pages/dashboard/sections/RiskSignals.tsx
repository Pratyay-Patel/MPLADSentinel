import { useMemo } from 'react';

import { summarizeRiskFactors, type DashboardData, type ProjectRisk } from '../../../data';
import { BarList, Card, DonutChart, RISK_LEVEL_COLOR, RISK_LEVEL_ORDER, SectionHeader } from '../../../ui';
import { formatCount } from '../../../format';

/**
 * Risk signals — aggregates over the works currently shown:
 *  • how works split across the four assessed risk levels (donut), and
 *  • (when `showFactors`) which rule-based factors are driving those flags.
 *
 * Computed from the risk view models already loaded for the dashboard (keyed off
 * `data.projects`, so they follow the global filter bar); no extra fetch.
 * Rule-based indicators, not an ML score (decision D22). The mosaic layout on the
 * Overview renders the donut on its own (`showFactors={false}`); the factor
 * breakdown lives in the named anomaly cards.
 */
export function RiskSignals({
  data,
  showFactors = true,
}: {
  data: DashboardData;
  showFactors?: boolean;
}) {
  const risks = useMemo(
    () =>
      data.projects
        .map((p) => data.risksByWorkId[p.sourceWorkId])
        .filter((r): r is ProjectRisk => r != null),
    [data.projects, data.risksByWorkId],
  );

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

  const factors = useMemo(
    () => (showFactors ? summarizeRiskFactors(risks) : []),
    [risks, showFactors],
  );

  return (
    <Card>
      <SectionHeader
        title="Risk signals"
        description={
          showFactors
            ? 'Distribution of works by assessed risk level, and the rule-based factors behind the flags. Indicators for review — not proof of wrongdoing.'
            : 'How the assessed works split across risk levels. Indicators for review — not proof of wrongdoing.'
        }
      />
      <div className={showFactors ? 'risk-signals' : 'risk-signals risk-signals--donut-only'}>
        <div className="risk-signals__donut">
          <DonutChart
            slices={slices}
            centerValue={formatCount(assessed)}
            centerCaption="works assessed"
            ariaLabel="Works by assessed risk level"
          />
        </div>
        {showFactors && (
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
        )}
      </div>
    </Card>
  );
}
