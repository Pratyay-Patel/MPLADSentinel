import type { DataProvider } from '../DataProvider';
import type { DataSource, Money, Project } from '../types';

/**
 * Feature service for the Fund & Utilisation Analytics screen (`/analytics`).
 *
 * Aggregates the provider's `listProjects` into state- and MP-level
 * fund-utilisation roll-ups. "Utilisation" = recorded payments ÷ sanctioned
 * cost, computed **only over works that actually have payment records**
 * (`paymentDataState === 'FETCHED_PRESENT'`) — a work with no payment record is
 * "unknown", never treated as zero spend (CLAUDE.md §8). Observations are
 * computed from the numbers, never editorialised.
 */

const INR = 'INR';
const money = (amount: number): Money => ({ amount, currency: INR });

function hasPayments(p: Project): p is Project & { recordedPayments: Money } {
  return p.paymentDataState === 'FETCHED_PRESENT' && p.recordedPayments != null;
}

/** Both the sanctioned estimate and a recorded payment are known — the only
 *  works a utilisation ratio can be computed over without mixing populations. */
function ratioReady(p: Project): p is Project & { recordedPayments: Money; estimatedCost: Money } {
  return hasPayments(p) && p.estimatedCost != null;
}

export type UtilisationBand = 'High' | 'Good' | 'Moderate' | 'Low';

/** Display order (best first) and the % thresholds that define each band. */
export const UTILISATION_BANDS: { band: UtilisationBand; min: number; label: string }[] = [
  { band: 'High', min: 85, label: '85% and above' },
  { band: 'Good', min: 70, label: '70–84%' },
  { band: 'Moderate', min: 50, label: '50–69%' },
  { band: 'Low', min: 0, label: 'below 50%' },
];

function bandFor(pct: number): UtilisationBand {
  return (UTILISATION_BANDS.find((b) => pct >= b.min) ?? UTILISATION_BANDS[UTILISATION_BANDS.length - 1])
    .band;
}

export interface StateUtilisation {
  state: string;
  works: number;
  /** Works with both an estimate and a recorded payment — the ratio's population. */
  worksScored: number;
  /** Σ estimated cost over `worksScored`. */
  sanctioned: number;
  /** Σ recorded payments over `worksScored`. */
  spent: number;
  utilisationPct: number;
  band: UtilisationBand;
}

export interface MpUtilisation {
  mpName: string;
  state: string | null;
  constituency: string | null;
  works: number;
  worksScored: number;
  sanctioned: number;
  spent: number;
  utilisationPct: number;
  band: UtilisationBand;
}

export interface UtilisationBucket {
  band: UtilisationBand;
  mps: number;
  /** Share of the MPs analysed that fall in this band. */
  sharePct: number;
}

export interface AnalyticsData {
  source: DataSource;

  totalWorks: number;
  /** Σ estimated cost over every work that has an estimate. */
  sanctionedTotal: Money;
  /** Σ recorded payments over works with payment records. */
  recordedPaymentsTotal: Money;
  worksWithPayments: number;
  worksWithoutPayments: number;
  /** Σ spent ÷ Σ sanctioned, over works with payment records only. Percentage. */
  recordedUtilisationPct: number;
  completedWorks: number;
  notCompletedWorks: number;

  /** States with at least one scored work, best utilisation first. */
  states: StateUtilisation[];
  statesAnalysed: number;
  avgStateUtilisationPct: number;
  topState: StateUtilisation | null;

  /** Every MP with at least one scored work, best utilisation first. */
  mps: MpUtilisation[];
  mpsAnalysed: number;
  buckets: UtilisationBucket[];

  observations: string[];
}

export interface AnalyticsService {
  load(signal?: AbortSignal): Promise<AnalyticsData>;
}

export function createAnalyticsService(provider: DataProvider): AnalyticsService {
  return {
    async load(signal) {
      const projects = await provider.listProjects(signal);

      // ---- national totals ----
      // The utilisation ratio is summed only over `ratioReady` works (both an
      // estimate and a recorded payment) so numerator and denominator cover the
      // same population. `recordedPaymentsTotal` is the wider Σ over every work
      // that has a payment record, for the headline KPI.
      let sanctionedAll = 0;
      let paymentsAll = 0;
      let worksWithPayments = 0;
      let ratioSanctioned = 0;
      let ratioSpent = 0;
      for (const p of projects) {
        if (p.estimatedCost) sanctionedAll += p.estimatedCost.amount;
        if (hasPayments(p)) {
          worksWithPayments += 1;
          paymentsAll += p.recordedPayments.amount;
        }
        if (ratioReady(p)) {
          ratioSanctioned += p.estimatedCost.amount;
          ratioSpent += p.recordedPayments.amount;
        }
      }
      const recordedUtilisationPct = ratioSanctioned > 0 ? (ratioSpent / ratioSanctioned) * 100 : 0;
      const completedWorks = projects.filter((p) => p.seenInCompleted).length;

      // ---- per state ----
      type Acc = { works: number; worksScored: number; sanctioned: number; spent: number };
      const emptyAcc = (): Acc => ({ works: 0, worksScored: 0, sanctioned: 0, spent: 0 });
      const byState = new Map<string, Acc>();
      for (const p of projects) {
        const s = p.state?.trim();
        if (!s) continue;
        const row = byState.get(s) ?? emptyAcc();
        row.works += 1;
        if (ratioReady(p)) {
          row.worksScored += 1;
          row.sanctioned += p.estimatedCost.amount;
          row.spent += p.recordedPayments.amount;
        }
        byState.set(s, row);
      }
      const states: StateUtilisation[] = [...byState.entries()]
        .filter(([, r]) => r.worksScored > 0 && r.sanctioned > 0)
        .map(([state, r]) => {
          const utilisationPct = (r.spent / r.sanctioned) * 100;
          return {
            state,
            works: r.works,
            worksScored: r.worksScored,
            sanctioned: r.sanctioned,
            spent: r.spent,
            utilisationPct,
            band: bandFor(utilisationPct),
          };
        })
        .sort((a, b) => b.utilisationPct - a.utilisationPct);
      const statesAnalysed = states.length;
      const avgStateUtilisationPct =
        statesAnalysed > 0
          ? states.reduce((sum, x) => sum + x.utilisationPct, 0) / statesAnalysed
          : 0;

      // ---- per MP ----
      type MpAcc = Acc & { state: string | null; constituency: string | null };
      const byMp = new Map<string, MpAcc>();
      for (const p of projects) {
        const mp = p.mpName?.trim();
        if (!mp) continue;
        const row =
          byMp.get(mp) ?? { ...emptyAcc(), state: p.state ?? null, constituency: p.constituency ?? null };
        row.works += 1;
        if (ratioReady(p)) {
          row.worksScored += 1;
          row.sanctioned += p.estimatedCost.amount;
          row.spent += p.recordedPayments.amount;
        }
        byMp.set(mp, row);
      }
      const mps: MpUtilisation[] = [...byMp.entries()]
        .filter(([, r]) => r.worksScored > 0 && r.sanctioned > 0)
        .map(([mpName, r]) => {
          const utilisationPct = (r.spent / r.sanctioned) * 100;
          return {
            mpName,
            state: r.state,
            constituency: r.constituency,
            works: r.works,
            worksScored: r.worksScored,
            sanctioned: r.sanctioned,
            spent: r.spent,
            utilisationPct,
            band: bandFor(utilisationPct),
          };
        })
        .sort((a, b) => b.utilisationPct - a.utilisationPct);
      const mpsAnalysed = mps.length;
      const bandCounts = new Map<UtilisationBand, number>();
      for (const m of mps) bandCounts.set(m.band, (bandCounts.get(m.band) ?? 0) + 1);
      const buckets: UtilisationBucket[] = UTILISATION_BANDS.map(({ band }) => {
        const count = bandCounts.get(band) ?? 0;
        return { band, mps: count, sharePct: mpsAnalysed > 0 ? (count / mpsAnalysed) * 100 : 0 };
      });

      // ---- computed observations ----
      const observations: string[] = [];
      if (states.length > 0) {
        const top = states[0];
        observations.push(
          `Highest recorded utilisation: ${top.state} at ${Math.round(top.utilisationPct)}% of sanctioned value paid out.`,
        );
        const belowHalf = states.filter((s) => s.utilisationPct < 50).length;
        observations.push(
          `${belowHalf} of ${statesAnalysed} states with scored works are below 50% recorded utilisation.`,
        );
      }
      if (projects.length > 0) {
        const pct = Math.round(((projects.length - worksWithPayments) / projects.length) * 100);
        observations.push(
          `${pct}% of works have no recorded payment yet — treated as unknown, not zero.`,
        );
      }
      if (mpsAnalysed > 0) {
        const low = buckets.find((b) => b.band === 'Low')?.mps ?? 0;
        observations.push(
          `${low} of ${mpsAnalysed} MPs analysed fall in the low-utilisation band (below 50%).`,
        );
      }

      return {
        source: provider.source,
        totalWorks: projects.length,
        sanctionedTotal: money(sanctionedAll),
        recordedPaymentsTotal: money(paymentsAll),
        worksWithPayments,
        worksWithoutPayments: projects.length - worksWithPayments,
        recordedUtilisationPct,
        completedWorks,
        notCompletedWorks: projects.length - completedWorks,
        states,
        statesAnalysed,
        avgStateUtilisationPct,
        topState: states[0] ?? null,
        mps,
        mpsAnalysed,
        buckets,
        observations,
      };
    },
  };
}
