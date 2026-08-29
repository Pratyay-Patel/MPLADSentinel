import { riskHeadline, type ProjectRisk } from '../../data';
import { RiskLevelBadge } from '../../ui';

export interface RiskCellProps {
  risk: ProjectRisk;
  /** Also render the concise indicator headline below the badge. */
  showHeadline?: boolean;
}

/**
 * Risk presentation shared by the attention and exploration tables. Level text
 * ("HIGH RISK") + a semantic badge — never colour alone. The value is wired to
 * come straight from the (future) risk API without touching this component.
 */
export function RiskCell({ risk, showHeadline = false }: RiskCellProps) {
  return (
    <span className="dash-risk">
      <RiskLevelBadge level={risk.level} />
      {showHeadline ? <span className="dash-risk__headline">{riskHeadline(risk)}</span> : null}
    </span>
  );
}
