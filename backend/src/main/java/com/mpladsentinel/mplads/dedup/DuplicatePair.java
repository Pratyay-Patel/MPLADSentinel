package com.mpladsentinel.mplads.dedup;

import java.util.List;

/**
 * A candidate duplicate: two ingested works in the same state, district and
 * category whose description text and/or estimated cost look like the same
 * physical work listed or sanctioned more than once.
 *
 * @param workA      the lower-ordered work in the pair
 * @param workB      the other work in the pair
 * @param score      0–100 (weights capped), how strong the match is
 * @param confidence banded from {@code score}
 * @param reasons    human-readable contributing signals — never empty, since a
 *                   pair is only ever produced when at least one real signal fired
 */
public record DuplicatePair(
        WorkSummary workA,
        WorkSummary workB,
        int score,
        DuplicateConfidence confidence,
        List<String> reasons
) {
}
