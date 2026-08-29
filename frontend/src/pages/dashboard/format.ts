import type { Money } from '../../data';

/**
 * Presentation-only formatters for the dashboard. Kept local to the dashboard —
 * not on the core domain types.
 */

/** Indian short-scale currency, e.g. 1_080_000 -> "₹10.8 L", 12_300_000 -> "₹1.2 Cr". */
export function formatINRCompact(money: Money | null | undefined): string {
  if (!money) return '—';
  const n = money.amount;
  if (n >= 10_000_000) return `₹${trim(n / 10_000_000)} Cr`;
  if (n >= 100_000) return `₹${trim(n / 100_000)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

/** Exact INR with grouping, e.g. "₹10,80,000". */
export function formatINRExact(money: Money | null | undefined): string {
  if (!money) return '—';
  return `₹${money.amount.toLocaleString('en-IN')}`;
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-IN');
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function trim(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}
