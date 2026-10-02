import type { DataProvider } from '../DataProvider';
import type {
  RecommendationStatus,
  WorkRecommendation,
  WorkRecommendationInput,
  WorkRecommendationStatusPatch,
} from '../types';

/**
 * Feature service for "Recommend a Work" (`/recommend`) — citizens propose a
 * new MPLADS work (e-SAKSHI-style); MoSPI / State / District review it.
 *
 * The state → MP/constituency picker is derived from `listPublicProjects()`
 * (the same citizen-safe list the Citizen Portal already reads) — real MPs
 * actually attributed to real ingested works, never invented, and never a
 * privileged endpoint a citizen couldn't otherwise reach.
 */

/**
 * Sector / category options a citizen may pick from. A closed, validated set
 * (matches the backend's `ck_work_recommendation_category`) — not tied to the
 * ingested `Project.category` values (those are a different, source-specific
 * taxonomy), but reflecting the real permissible-works domains under MPLADS
 * guidelines (drinking water, roads, education, health, etc).
 */
export const RECOMMENDATION_CATEGORIES = [
  'Drinking Water & Sanitation',
  'Roads & Transportation',
  'Education Infrastructure',
  'Health Infrastructure',
  'Community & Public Buildings',
  'Sports Infrastructure',
  'Irrigation & Agriculture',
  'Electricity & Non-conventional Energy',
  'Other',
] as const;

/** Review states, in workflow order. Authorities move a recommendation forward. */
export const RECOMMENDATION_STATUSES: RecommendationStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'RECOMMENDED',
  'REJECTED',
];

export const RECOMMENDATION_STATUS_LABEL: Record<RecommendationStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  RECOMMENDED: 'Recommended',
  REJECTED: 'Rejected',
};

/** One real MP + constituency, for the state-filtered picker. */
export interface MpOption {
  mpName: string;
  constituency: string;
}

export interface RecommendationsData {
  recommendations: WorkRecommendation[];
  /** Every state with at least one real ingested work, sorted. */
  states: string[];
  /** Real MPs (deduped), keyed by state. */
  mpsByState: Record<string, MpOption[]>;
}

export interface WorkRecommendationsService {
  load(signal?: AbortSignal): Promise<RecommendationsData>;
  submit(input: WorkRecommendationInput, signal?: AbortSignal): Promise<WorkRecommendation>;
  updateStatus(
    id: string,
    patch: WorkRecommendationStatusPatch,
    signal?: AbortSignal,
  ): Promise<WorkRecommendation>;
}

export function createWorkRecommendationsService(provider: DataProvider): WorkRecommendationsService {
  return {
    async load(signal) {
      const [recommendations, projects] = await Promise.all([
        provider.listWorkRecommendations(signal),
        provider.listPublicProjects(signal),
      ]);

      const mpsByState: Record<string, MpOption[]> = {};
      const seen = new Set<string>();
      for (const p of projects) {
        if (!p.state || !p.memberOfParliament || !p.constituency) continue;
        const key = `${p.state}::${p.memberOfParliament}::${p.constituency}`;
        if (seen.has(key)) continue;
        seen.add(key);
        (mpsByState[p.state] ??= []).push({
          mpName: p.memberOfParliament,
          constituency: p.constituency,
        });
      }
      for (const list of Object.values(mpsByState)) {
        list.sort((a, b) => a.mpName.localeCompare(b.mpName));
      }
      const states = Object.keys(mpsByState).sort((a, b) => a.localeCompare(b));

      return { recommendations, states, mpsByState };
    },
    submit: (input, signal) => provider.submitWorkRecommendation(input, signal),
    updateStatus: (id, patch, signal) => provider.updateWorkRecommendationStatus(id, patch, signal),
  };
}
