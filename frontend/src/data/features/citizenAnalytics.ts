import type { DataProvider } from '../DataProvider';
import type { PublicProject } from '../publicProject';
import type { Money } from '../types';
import {
  bandFor,
  UTILISATION_BANDS,
  type AnalyticsData,
  type MpUtilisation,
  type StateUtilisation,
  type UtilisationBand,
  type UtilisationBucket,
} from './analytics';

/**
 * Feature service for the citizen-safe Analytics screen (`/citizen/analytics`).
 *
 * Identical computation to {@link ./analytics.ts}'s authority version — same
 * `AnalyticsData` shape, same utilisation-band charts reused as-is — but
 * sourced from {@link DataProvider.listPublicProjects} instead of the
 * authority-only `listProjects`. The authority version already contains no
 * risk data (verified: no field here comes from `RiskEngine`), so nothing is
 * stripped; this is a straight re-source onto the public data path so a
 * citizen session doesn't hit the government-role-only `/api/works` endpoint.
 *
 * `completedWorks` is derived from `status` (the only lifecycle signal
 * `PublicProject` carries) rather than the authority side's `seenInCompleted`
 * ingestion flag — same approximation already used by the Transparency
 * Overview and the citizen-safe Compare MPs.
 */

const INR = 'INR';
const money = (amount: number): Money => ({ amount, currency: INR });

function hasPayments(p: PublicProject): p is PublicProject & { recordedPayments: Money } {
  return p.paymentDataState === 'FETCHED_PRESENT' && p.recordedPayments != null;
}

function ratioReady(
  p: PublicProject,
): p is PublicProject & { recordedPayments: Money; estimatedCost: Money } {
  return hasPayments(p) && p.estimatedCost != null;
}

export interface CitizenAnalyticsService {
  load(signal?: AbortSignal): Promise<AnalyticsData>;
}

export function createCitizenAnalyticsService(provider: DataProvider): CitizenAnalyticsService {
  return {
    async load(signal) {
      const projects = await provider.listPublicProjects(signal);
      return buildCitizenAnalytics(provider.source, projects);
    },
  };
}

/** Pure roll-up, exported for testing without a provider. */
export function buildCitizenAnalytics(
  source: AnalyticsData['source'],
  projects: PublicProject[],
): AnalyticsData {
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
  const completedWorks = projects.filter(
    (p) => p.status === 'COMPLETED' || p.status === 'RECOMMENDED_AND_COMPLETED',
  ).length;

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
    statesAnalysed > 0 ? states.reduce((sum, x) => sum + x.utilisationPct, 0) / statesAnalysed : 0;

  type MpAcc = Acc & { state: string | null; constituency: string | null };
  const byMp = new Map<string, MpAcc>();
  for (const p of projects) {
    const mp = p.memberOfParliament?.trim();
    if (!mp) continue;
    const row = byMp.get(mp) ?? { ...emptyAcc(), state: p.state ?? null, constituency: p.constituency ?? null };
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
    observations.push(`${pct}% of works have no recorded payment yet — treated as unknown, not zero.`);
  }
  if (mpsAnalysed > 0) {
    const low = buckets.find((b) => b.band === 'Low')?.mps ?? 0;
    observations.push(`${low} of ${mpsAnalysed} MPs analysed fall in the low-utilisation band (below 50%).`);
  }

  return {
    source,
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
}
