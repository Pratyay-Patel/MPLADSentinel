import { StatusBadge, type StatusTone } from './StatusBadge';

/** Structurally matches the domain `RiskLevel`; kept local so this stays a pure primitive. */
export type RiskLevelValue = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

const TONE: Record<RiskLevelValue, StatusTone> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'success',
  UNKNOWN: 'neutral',
};

/** "HIGH RISK" etc. — semantic badge + text, never colour alone. */
export function RiskLevelBadge({ level }: { level: RiskLevelValue }) {
  return (
    <StatusBadge tone={TONE[level]} srLabel="Risk level">
      {level} RISK
    </StatusBadge>
  );
}
