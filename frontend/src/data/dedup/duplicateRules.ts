import type {
  DuplicateConfidence,
  DuplicatePair,
  DuplicatePairsResult,
  DuplicateWorkSummary,
  Project,
} from '../types';

/**
 * De-duplication of works (requirements F7, decision D35) — the
 * **demo-mode** source. A direct port of the real Round-1 engine
 * (`com.mpladsentinel.mplads.dedup`) — same grouping, thresholds and weights,
 * kept in sync by hand, same convention as `risk/rules.ts` for D22.
 *
 * Works are grouped by (state, district, category) — comparing works in
 * different locations or sectors isn't meaningful — and every pair within a
 * group is scored. Being in the same group alone never flags a pair: many
 * legitimate, distinct works share a state, district and category, so at
 * least one real signal (near-identical description and/or overlapping
 * estimated cost) must fire before a pair is reported.
 */

/** Word-overlap ratio at/above which two descriptions count as "near-identical". */
const TEXT_SIMILARITY_THRESHOLD = 0.6;
/** Relative cost difference at/below which two estimates count as "overlapping". */
const COST_OVERLAP_THRESHOLD = 0.2;

const TEXT_SIMILAR_WEIGHT = 60;
const COST_SIMILAR_WEIGHT = 30;

function confidenceFor(score: number): DuplicateConfidence {
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

function tokenize(text: string | null): Set<string> {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2); // drop very short/common tokens ("of", "a", "in"...)
  return new Set(words);
}

/** Jaccard similarity over lowercase word tokens, or `null` if either side has none. */
function descriptionSimilarity(a: string | null, b: string | null): number | null {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.size === 0 || tokensB.size === 0) return null;

  let intersectionSize = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersectionSize += 1;
  }
  const unionSize = tokensA.size + tokensB.size - intersectionSize;
  return intersectionSize / unionSize;
}

/** |a-b| ÷ max(a,b), or `null` if either cost is missing or non-positive. */
function relativeCostDifference(a: number | null, b: number | null): number | null {
  if (a == null || b == null || a <= 0 || b <= 0) return null;
  const larger = Math.max(a, b);
  return Math.abs(a - b) / larger;
}

function normalizedKey(value: string | null): string | null {
  if (!value || !value.trim()) return null;
  return value.trim().toLowerCase();
}

function groupKey(project: Project): string | null {
  const state = normalizedKey(project.state);
  const district = normalizedKey(project.district);
  const category = normalizedKey(project.category);
  if (!state || !district || !category) return null;
  return `${state}|${district}|${category}`;
}

function summarize(project: Project): DuplicateWorkSummary {
  return {
    sourceWorkId: project.sourceWorkId,
    workDescription: project.workDescription,
    state: project.state,
    district: project.district,
    category: project.category,
    estimatedCost: project.estimatedCost?.amount ?? null,
  };
}

function evaluatePair(a: Project, b: Project): DuplicatePair | null {
  const reasons: string[] = [];
  let score = 0;

  const textSimilarity = descriptionSimilarity(a.workDescription, b.workDescription);
  if (textSimilarity != null && textSimilarity >= TEXT_SIMILARITY_THRESHOLD) {
    score += TEXT_SIMILAR_WEIGHT;
    reasons.push(
      `Work descriptions are ${Math.round(textSimilarity * 100)}% similar (same state, district and category)`,
    );
  }

  const costDiff = relativeCostDifference(
    a.estimatedCost?.amount ?? null,
    b.estimatedCost?.amount ?? null,
  );
  if (costDiff != null && costDiff <= COST_OVERLAP_THRESHOLD) {
    score += COST_SIMILAR_WEIGHT;
    reasons.push(`Estimated costs are within ${Math.round(costDiff * 100)}% of each other`);
  }

  if (reasons.length === 0) return null;
  const capped = Math.min(100, score);
  return {
    workA: summarize(a),
    workB: summarize(b),
    score: capped,
    confidence: confidenceFor(capped),
    reasons,
  };
}

/** Every candidate duplicate pair across the given projects. */
export function findDuplicatePairs(projects: Project[]): DuplicatePair[] {
  const groups = new Map<string, Project[]>();
  for (const project of projects) {
    const key = groupKey(project);
    if (!key) continue;
    const group = groups.get(key);
    if (group) {
      group.push(project);
    } else {
      groups.set(key, [project]);
    }
  }

  const pairs: DuplicatePair[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const pair = evaluatePair(group[i], group[j]);
        if (pair) pairs.push(pair);
      }
    }
  }
  return pairs;
}

/**
 * Across the full ingested dataset this can surface tens of thousands of
 * candidate pairs; rendering all of them makes the screen sluggish for no
 * real benefit, since a reviewer only ever looks at the highest-confidence
 * pairs first. Kept in sync by hand with the real backend's own cap
 * (`DuplicateController.MAX_RETURNED_PAIRS`).
 */
export const MAX_DUPLICATE_PAIRS = 9_999;

/** Sorts by score (highest first) and caps at {@link MAX_DUPLICATE_PAIRS}, mirroring what the real backend does before it serializes a response. */
export function capDuplicatePairs(pairs: DuplicatePair[]): DuplicatePairsResult {
  const sorted = [...pairs].sort((a, b) => b.score - a.score);
  return { pairs: sorted.slice(0, MAX_DUPLICATE_PAIRS), totalFound: pairs.length };
}
