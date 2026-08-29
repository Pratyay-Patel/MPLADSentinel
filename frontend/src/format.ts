import type { Money } from './data';

/**
 * Presentation-only formatters shared across screens. Not on the core domain
 * types.
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

/** ISO date (or year) -> "15 Aug 2024". A bare year string -> that year. `null` -> "—". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function trim(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}
