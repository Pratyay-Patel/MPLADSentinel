import type { RiskLevelValue } from './RiskLevelBadge';

/**
 * Chart fills for the four risk levels — the dataviz status palette (good /
 * warning / serious / critical), fixed and never themed. Identity is always
 * carried by a label too; colour is never the only signal.
 */
export const RISK_LEVEL_COLOR: Record<RiskLevelValue, string> = {
  HIGH: '#d03b3b',
  MEDIUM: '#fab219',
  LOW: '#0ca30c',
  UNKNOWN: '#9aa1ab',
};

/** Severity-first order for legends and stacks. */
export const RISK_LEVEL_ORDER: RiskLevelValue[] = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
