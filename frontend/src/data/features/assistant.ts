import type { DataProvider } from '../DataProvider';
import type { DataSource, RiskLevel } from '../types';
import { workTitle } from '../../format';
import { summarizeRiskFactors } from '../risk/riskFactors';
import { createAnalyticsService } from './analytics';
import { createRiskService } from './risk';

/**
 * Feature service for the Assistant (`/assistant`). Loads an in-memory index of
 * the works, MPs, states and categories currently available through the
 * DataProvider, plus a few headline aggregates. The Assistant answers by
 * *retrieving* from this index — it never invents a figure; every number in an
 * answer comes from here or from the fixed methodology guide
 * (`pages/assistant/knowledge.ts`).
 */

const zeroRisk = (): Record<RiskLevel, number> => ({ HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 });

export interface AssistantWork {
  id: number;
  title: string;
  description: string | null;
  state: string | null;
  district: string | null;
  category: string | null;
  mpName: string | null;
  estimatedCost: number | null;
  recordedPayments: number | null;
  riskLevel: RiskLevel;
  riskScore: number | null;
  riskReasons: string[];
}

export interface AssistantMp {
  name: string;
  state: string | null;
  constituency: string | null;
  works: number;
  completed: number;
  /** Σ estimated cost / Σ recorded payments over the MP's scored works. */
  utilisationPct: number | null;
  band: string | null;
  risk: Record<RiskLevel, number>;
  /** HIGH + MEDIUM. */
  flagged: number;
}

export interface AssistantState {
  state: string;
  works: number;
  utilisationPct: number | null;
  band: string | null;
  risk: Record<RiskLevel, number>;
  flagged: number;
}

export interface AssistantCategory {
  category: string;
  works: number;
  risk: Record<RiskLevel, number>;
  flagged: number;
}

export interface AssistantData {
  source: DataSource;
  totalWorks: number;
  worksWithPayments: number;
  /** Recorded payments ÷ sanctioned, over works with both known. Percentage. */
  recordedUtilisationPct: number;
  riskCounts: Record<RiskLevel, number>;
  /** HIGH + MEDIUM. */
  flaggedWorks: number;
  topFactors: { label: string; count: number }[];

  /** Every loaded work, id-addressable and filterable. */
  works: AssistantWork[];
  mps: AssistantMp[];
  states: AssistantState[];
  categories: AssistantCategory[];

  // name lists for question parsing
  knownStates: string[];
  knownDistricts: string[];
  knownCategories: string[];
  knownMps: string[];
}

export interface AssistantService {
  load(signal?: AbortSignal): Promise<AssistantData>;
}

export function createAssistantService(provider: DataProvider): AssistantService {
  return {
    async load(signal) {
      const [analytics, risk] = await Promise.all([
        createAnalyticsService(provider).load(signal),
        createRiskService(provider).load(signal),
      ]);

      const rows = risk.rows;

      const works: AssistantWork[] = rows.map(({ project, risk: r }) => ({
        id: project.sourceWorkId,
        title: workTitle(project.workDescription, project.sourceWorkId),
        description: project.workDescription,
        state: project.state,
        district: project.district,
        category: project.category,
        mpName: project.mpName,
        estimatedCost: project.estimatedCost?.amount ?? null,
        recordedPayments:
          project.paymentDataState === 'FETCHED_PRESENT'
            ? (project.recordedPayments?.amount ?? null)
            : null,
        riskLevel: r.level,
        riskScore: r.score,
        riskReasons: r.reasons,
      }));

      // ---- per MP ----
      const mpUtil = new Map(analytics.mps.map((m) => [m.mpName, m]));
      const byMp = new Map<
        string,
        { state: string | null; constituency: string | null; works: number; completed: number; risk: Record<RiskLevel, number> }
      >();
      for (const { project, risk: r } of rows) {
        const mp = project.mpName?.trim();
        if (!mp) continue;
        const acc =
          byMp.get(mp) ??
          { state: project.state, constituency: project.constituency, works: 0, completed: 0, risk: zeroRisk() };
        acc.works += 1;
        if (project.seenInCompleted) acc.completed += 1;
        acc.risk[r.level] += 1;
        byMp.set(mp, acc);
      }
      const mps: AssistantMp[] = [...byMp.entries()]
        .map(([name, a]) => ({
          name,
          state: a.state,
          constituency: a.constituency,
          works: a.works,
          completed: a.completed,
          utilisationPct: mpUtil.get(name)?.utilisationPct ?? null,
          band: mpUtil.get(name)?.band ?? null,
          risk: a.risk,
          flagged: a.risk.HIGH + a.risk.MEDIUM,
        }))
        .sort((x, y) => y.works - x.works);

      // ---- per state ----
      const stateUtil = new Map(analytics.states.map((s) => [s.state, s]));
      const byState = new Map<string, { works: number; risk: Record<RiskLevel, number> }>();
      for (const { project, risk: r } of rows) {
        const s = project.state?.trim();
        if (!s) continue;
        const acc = byState.get(s) ?? { works: 0, risk: zeroRisk() };
        acc.works += 1;
        acc.risk[r.level] += 1;
        byState.set(s, acc);
      }
      const states: AssistantState[] = [...byState.entries()]
        .map(([state, a]) => ({
          state,
          works: a.works,
          utilisationPct: stateUtil.get(state)?.utilisationPct ?? null,
          band: stateUtil.get(state)?.band ?? null,
          risk: a.risk,
          flagged: a.risk.HIGH + a.risk.MEDIUM,
        }))
        .sort((x, y) => y.works - x.works);

      // ---- per category ----
      const byCategory = new Map<string, { works: number; risk: Record<RiskLevel, number> }>();
      for (const { project, risk: r } of rows) {
        const c = project.category?.trim();
        if (!c) continue;
        const acc = byCategory.get(c) ?? { works: 0, risk: zeroRisk() };
        acc.works += 1;
        acc.risk[r.level] += 1;
        byCategory.set(c, acc);
      }
      const categories: AssistantCategory[] = [...byCategory.entries()]
        .map(([category, a]) => ({
          category,
          works: a.works,
          risk: a.risk,
          flagged: a.risk.HIGH + a.risk.MEDIUM,
        }))
        .sort((x, y) => y.works - x.works);

      const topFactors = summarizeRiskFactors(rows.map((r) => r.risk))
        .slice(0, 6)
        .map((f) => ({ label: f.label, count: f.count }));

      const uniqSorted = (values: (string | null)[]) =>
        [...new Set(values.filter((v): v is string => !!v && v.trim() !== ''))].sort();

      return {
        source: provider.source,
        totalWorks: analytics.totalWorks,
        worksWithPayments: analytics.worksWithPayments,
        recordedUtilisationPct: analytics.recordedUtilisationPct,
        riskCounts: risk.countsByLevel,
        flaggedWorks: risk.countsByLevel.HIGH + risk.countsByLevel.MEDIUM,
        topFactors,
        works,
        mps,
        states,
        categories,
        knownStates: uniqSorted(rows.map((r) => r.project.state)),
        knownDistricts: uniqSorted(rows.map((r) => r.project.district)),
        knownCategories: uniqSorted(rows.map((r) => r.project.category)),
        knownMps: uniqSorted(rows.map((r) => r.project.mpName)),
      };
    },
  };
}
