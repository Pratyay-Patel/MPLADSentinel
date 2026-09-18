import { workTitle } from '../../format';
import type { DataProvider } from '../DataProvider';
import type { PublicProject } from '../publicProject';
import type { DataSource } from '../types';
import { createCitizenAnalyticsService } from './citizenAnalytics';

/**
 * Feature service for the citizen-safe Assistant (`/citizen/assistant`).
 *
 * Same in-memory-retrieval design as the authority {@link ./assistant.ts},
 * but built entirely from {@link DataProvider.listPublicProjects} and the
 * citizen-safe Analytics service — no risk field exists anywhere on
 * {@link CitizenAssistantData}, so the answer templates in
 * `pages/citizen/citizenAnswer.ts` never have risk data to reach for in the
 * first place (risk is not exposed to citizens elsewhere in this app either —
 * see the Risk & Alerts / Compare MPs / notification code).
 */

export interface CitizenAssistantWork {
  id: number;
  title: string;
  description: string | null;
  state: string | null;
  district: string | null;
  category: string | null;
  mpName: string | null;
  estimatedCost: number | null;
  recordedPayments: number | null;
}

export interface CitizenAssistantMp {
  name: string;
  state: string | null;
  constituency: string | null;
  works: number;
  completed: number;
  /** Σ estimated cost / Σ recorded payments over the MP's scored works. */
  utilisationPct: number | null;
  band: string | null;
}

export interface CitizenAssistantState {
  state: string;
  works: number;
  utilisationPct: number | null;
  band: string | null;
}

export interface CitizenAssistantCategory {
  category: string;
  works: number;
}

export interface CitizenAssistantData {
  source: DataSource;
  totalWorks: number;
  worksWithPayments: number;
  /** Recorded payments ÷ sanctioned, over works with both known. Percentage. */
  recordedUtilisationPct: number;

  /** Every loaded public work, id-addressable and filterable. */
  works: CitizenAssistantWork[];
  mps: CitizenAssistantMp[];
  states: CitizenAssistantState[];
  categories: CitizenAssistantCategory[];

  // name lists for question parsing
  knownStates: string[];
  knownDistricts: string[];
  knownCategories: string[];
  knownMps: string[];
}

export interface CitizenAssistantService {
  load(signal?: AbortSignal): Promise<CitizenAssistantData>;
}

export function createCitizenAssistantService(provider: DataProvider): CitizenAssistantService {
  return {
    async load(signal) {
      const [analytics, projects] = await Promise.all([
        createCitizenAnalyticsService(provider).load(signal),
        provider.listPublicProjects(signal),
      ]);

      const works: CitizenAssistantWork[] = projects.map((p) => ({
        id: p.reference,
        title: workTitle(p.workDescription, p.reference),
        description: p.workDescription,
        state: p.state,
        district: p.district,
        category: p.category,
        mpName: p.memberOfParliament,
        estimatedCost: p.estimatedCost?.amount ?? null,
        recordedPayments:
          p.paymentDataState === 'FETCHED_PRESENT' ? (p.recordedPayments?.amount ?? null) : null,
      }));

      // ---- per MP ----
      const mpUtil = new Map(analytics.mps.map((m) => [m.mpName, m]));
      const byMp = new Map<
        string,
        { state: string | null; constituency: string | null; works: number; completed: number }
      >();
      for (const p of projects) {
        const mp = p.memberOfParliament?.trim();
        if (!mp) continue;
        const acc = byMp.get(mp) ?? { state: p.state, constituency: p.constituency, works: 0, completed: 0 };
        acc.works += 1;
        if (p.status === 'COMPLETED' || p.status === 'RECOMMENDED_AND_COMPLETED') acc.completed += 1;
        byMp.set(mp, acc);
      }
      const mps: CitizenAssistantMp[] = [...byMp.entries()]
        .map(([name, a]) => ({
          name,
          state: a.state,
          constituency: a.constituency,
          works: a.works,
          completed: a.completed,
          utilisationPct: mpUtil.get(name)?.utilisationPct ?? null,
          band: mpUtil.get(name)?.band ?? null,
        }))
        .sort((x, y) => y.works - x.works);

      // ---- per state ----
      const stateUtil = new Map(analytics.states.map((s) => [s.state, s]));
      const byState = new Map<string, number>();
      for (const p of projects) {
        const s = p.state?.trim();
        if (!s) continue;
        byState.set(s, (byState.get(s) ?? 0) + 1);
      }
      const states: CitizenAssistantState[] = [...byState.entries()]
        .map(([state, works]) => ({
          state,
          works,
          utilisationPct: stateUtil.get(state)?.utilisationPct ?? null,
          band: stateUtil.get(state)?.band ?? null,
        }))
        .sort((x, y) => y.works - x.works);

      // ---- per category ----
      const byCategory = new Map<string, number>();
      for (const p of projects) {
        const c = p.category?.trim();
        if (!c) continue;
        byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
      }
      const categories: CitizenAssistantCategory[] = [...byCategory.entries()]
        .map(([category, works]) => ({ category, works }))
        .sort((x, y) => y.works - x.works);

      const uniqSorted = (values: (string | null)[]) =>
        [...new Set(values.filter((v): v is string => !!v && v.trim() !== ''))].sort();

      return {
        source: provider.source,
        totalWorks: analytics.totalWorks,
        worksWithPayments: analytics.worksWithPayments,
        recordedUtilisationPct: analytics.recordedUtilisationPct,
        works,
        mps,
        states,
        categories,
        knownStates: uniqSorted(projects.map((p: PublicProject) => p.state)),
        knownDistricts: uniqSorted(projects.map((p) => p.district)),
        knownCategories: uniqSorted(projects.map((p) => p.category)),
        knownMps: uniqSorted(projects.map((p) => p.memberOfParliament)),
      };
    },
  };
}
