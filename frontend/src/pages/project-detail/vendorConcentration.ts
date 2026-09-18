import type { PaymentInstallment } from '../../data';

export interface VendorShare {
  name: string;
  amount: number;
  sharePct: number;
  tone: 'danger' | 'warning' | 'neutral';
}

export interface VendorConcentration {
  /** Top vendors by share, most concentrated first (capped at MAX_SHOWN). */
  vendors: VendorShare[];
  /** Vendors folded into "+N more" beyond the cap. */
  otherCount: number;
  otherSharePct: number;
  totalAmount: number;
  vendorCount: number;
  /** Herfindahl-Hirschman Index (0-10000) over vendor share of this work's recorded payments. */
  hhi: number;
  concentrationLabel: 'Highly concentrated' | 'Moderately concentrated' | 'Not concentrated';
}

const MAX_SHOWN = 6;
/** DOJ/FTC Horizontal Merger Guidelines thresholds, applied here to vendor
 * payment share within a single work (not a market) — a repurposed, not an
 * official, use of the metric. */
const HHI_HIGH = 2500;
const HHI_MODERATE = 1500;

/**
 * Real-time vendor payment concentration for one work, computed entirely from
 * that work's own already-loaded payment installments — no new data, no
 * fabrication. Returns null when there's nothing meaningful to show (fewer
 * than 2 named vendors, or no positive recorded amounts).
 */
export function computeVendorConcentration(
  payments: PaymentInstallment[] | null | undefined,
): VendorConcentration | null {
  if (!payments || payments.length === 0) return null;

  const byVendor = new Map<string, number>();
  let totalAmount = 0;
  for (const payment of payments) {
    const name = payment.vendorName?.trim();
    const amount = payment.amount.amount;
    if (!name || !Number.isFinite(amount) || amount <= 0) continue;
    byVendor.set(name, (byVendor.get(name) ?? 0) + amount);
    totalAmount += amount;
  }

  if (byVendor.size < 2 || totalAmount <= 0) return null;

  const shares = [...byVendor.entries()]
    .map(([name, amount]) => ({ name, amount, sharePct: (amount / totalAmount) * 100 }))
    .sort((a, b) => b.sharePct - a.sharePct);

  const hhi = Math.round(shares.reduce((sum, v) => sum + v.sharePct * v.sharePct, 0));

  const vendors: VendorShare[] = shares.slice(0, MAX_SHOWN).map((v) => ({
    ...v,
    tone: v.sharePct >= 40 ? 'danger' : v.sharePct >= 20 ? 'warning' : 'neutral',
  }));

  const rest = shares.slice(MAX_SHOWN);

  return {
    vendors,
    otherCount: rest.length,
    otherSharePct: rest.reduce((sum, v) => sum + v.sharePct, 0),
    totalAmount,
    vendorCount: shares.length,
    hhi,
    concentrationLabel:
      hhi >= HHI_HIGH ? 'Highly concentrated' : hhi >= HHI_MODERATE ? 'Moderately concentrated' : 'Not concentrated',
  };
}
