import { recommendedAction, riskDimensions, type ProjectRisk } from '../../data';
import { Card, KeyValueList, RiskLevelBadge, SectionHeader } from '../../ui';
import { AlertTriangleIcon } from '../../ui/icons';
import { FactorContributionChart } from './FactorContributionChart';

/**
 * Risk assessment card for Project Details. Beyond the score + raw reasons it
 * shows a SHAP-style per-factor score contribution, a "recommended next action"
 * for the reviewer, and a fixed checklist of the model's six factors with this
 * work's hits marked. Every value comes from the shared `ProjectRisk` view model
 * (`src/data/risk/riskInsights.ts`) — no fabricated per-factor numbers.
 */
export function RiskInsights({ risk }: { risk: ProjectRisk }) {
  const action = recommendedAction(risk);
  const dimensions = riskDimensions(risk);
  const hasIndicators = risk.level !== 'UNKNOWN' && risk.reasons.length > 0;

  return (
    <Card>
      <SectionHeader
        title="Risk assessment"
        description="Score from the weighted statistical risk model over this work's financial and data-quality signals — pointers for review, not proof of wrongdoing."
        icon={<AlertTriangleIcon />}
        tone="danger"
        actions={<RiskLevelBadge level={risk.level} />}
      />

      {risk.level === 'UNKNOWN' ? (
        <p className="detail-note" style={{ marginTop: 0 }}>
          Not enough data to assess this work.
        </p>
      ) : risk.reasons.length === 0 ? (
        <p className="detail-note" style={{ marginTop: 0 }}>
          No current indicators for this work.
        </p>
      ) : (
        <>
          <KeyValueList items={[{ label: 'Risk score', value: `${risk.score} / 100` }]} />

          <FactorContributionChart risk={risk} />

          {action && (
            <div className="detail-action" role="note">
              <p className="detail-action__title">Recommended next action</p>
              <p className="detail-action__body">{action.action}</p>
              <p className="detail-action__trigger">
                Because: <span>{action.trigger}</span>
              </p>
            </div>
          )}
        </>
      )}

      <div className="detail-dimensions" aria-label="Risk dimension checklist">
        <p className="detail-dimensions__caption">
          {hasIndicators
            ? "Where the flagged indicators fall across the model's six factors:"
            : "The model's six factors, checked for every work — none flagged here:"}
        </p>
        <ul className="detail-dimensions__list">
          {dimensions.map((dim) => (
            <li
              key={dim.label}
              className="detail-dimensions__item"
              data-flagged={dim.flagged || undefined}
            >
              <span className="detail-dimensions__marker" aria-hidden>
                {dim.flagged ? '!' : '✓'}
              </span>
              <span className="detail-dimensions__text">
                <span className="detail-dimensions__label">
                  {dim.label}
                  <span className="detail-dimensions__state">
                    {dim.flagged ? 'Flagged' : 'Clear'}
                  </span>
                </span>
                <span className="detail-dimensions__note">{dim.note ?? dim.blurb}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
