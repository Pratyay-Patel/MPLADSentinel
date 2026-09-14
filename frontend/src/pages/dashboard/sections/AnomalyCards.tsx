import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  RISK_FACTOR_DESCRIPTIONS,
  RISK_FACTOR_SLUGS,
  summarizeRiskFactors,
  type DashboardData,
  type ProjectRisk,
} from '../../../data';
import { Card, SectionHeader } from '../../../ui';
import { AlertTriangleIcon } from '../../../ui/icons';
import { formatCount } from '../../../format';

const MAX_CARDS = 6;

/** Cycled per-card accent — these are risk indicators, not a fixed severity scale,
 * so tone here is purely for visual distinction, not a danger/success judgement. */
const CARD_TONES = ['info', 'warning', 'success', 'brand'] as const;

/**
 * Named anomaly cards — the same `summarizeRiskFactors` counts the old bar list
 * showed, re-skinned as scannable cards. Each links into the risk queue filtered
 * to that factor (`/risk?factor=<slug>`). Counts are statistical risk-model
 * indicators for review, not confirmed findings (decision D22 / CLAUDE.md §17).
 */
export function AnomalyCards({ data }: { data: DashboardData }) {
  const risks = useMemo(
    () =>
      data.projects
        .map((p) => data.risksByWorkId[p.sourceWorkId])
        .filter((r): r is ProjectRisk => r != null),
    [data.projects, data.risksByWorkId],
  );

  const factors = useMemo(() => summarizeRiskFactors(risks).slice(0, MAX_CARDS), [risks]);

  if (factors.length === 0) return null;

  return (
    <Card>
      <SectionHeader
        title="Risk factors detected"
        description="How often each risk factor is flagged across the works in view, by the statistical risk model. Indicators for review, not confirmed findings."
        icon={<AlertTriangleIcon />}
        tone="warning"
      />
      <ul className="anomaly-cards">
        {factors.map((factor, i) => (
          <li key={factor.label} className="anomaly-card" data-tone={CARD_TONES[i % CARD_TONES.length]}>
            <span className="anomaly-card__count">{formatCount(factor.count)}</span>
            <span className="anomaly-card__label">{factor.label}</span>
            <span className="anomaly-card__desc">{RISK_FACTOR_DESCRIPTIONS[factor.label]}</span>
            <Link
              className="anomaly-card__link"
              to={`/risk?factor=${RISK_FACTOR_SLUGS[factor.label]}`}
            >
              View cases <span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
