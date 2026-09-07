import { featureContributions, type ProjectRisk, type RiskFactorCategory } from '../../data';

/**
 * Categorical hue per model factor (fixed order, CVD-validated via the dataviz
 * `validate_palette.js`). Colour reinforces the factor label, which always sits
 * beside it; the low-contrast pair (green / amber) also carries a direct points
 * value, so it is never colour-alone.
 */
const FACTOR_COLOUR: Record<RiskFactorCategory, string> = {
  'Cost overspend': '#2a78d6',
  'Payout before completion': '#eb6834',
  'Single-installment payout': '#1baf7a',
  'Dormant, no payments': '#eda100',
  'Cost outlier vs peers': '#8b5cf6',
  'Payment data unavailable': '#e0457b',
  'Other signal': '#0891b2',
};

/**
 * SHAP-style score explanation: each flagged factor as a bar sized to the points
 * it adds to this work's 0–100 risk score, largest first. Weights are the
 * model's own (`featureContributions` → `rules.ts`), not fabricated.
 */
export function FactorContributionChart({ risk }: { risk: ProjectRisk }) {
  const factors = featureContributions(risk);
  if (factors.length === 0) return null;

  const max = Math.max(...factors.map((f) => f.points));

  return (
    <div className="fc" role="group" aria-label="Score contribution by factor">
      <p className="fc__caption">
        Each factor&rsquo;s weight toward the <strong>{risk.score} / 100</strong> score, largest
        first. The score is the sum of these weights (capped at 100).
      </p>
      <ul className="fc__list">
        {factors.map((f) => (
          <li key={f.detail} className="fc__row">
            <div className="fc__head">
              <span className="fc__label">
                <span
                  className="fc__swatch"
                  style={{ background: FACTOR_COLOUR[f.category] }}
                  aria-hidden
                />
                {f.category}
              </span>
              <span className="fc__points">+{f.points} pts</span>
            </div>
            <div className="fc__track">
              <div
                className="fc__bar"
                style={{
                  width: `${Math.max(6, (f.points / max) * 100)}%`,
                  background: FACTOR_COLOUR[f.category],
                }}
              />
            </div>
            <p className="fc__detail">{f.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
