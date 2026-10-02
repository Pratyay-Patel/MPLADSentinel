package com.mpladsentinel.mplads.dedup;

import java.util.List;

/**
 * Response for {@code GET /api/works/duplicates}: the highest-scoring pairs
 * (capped — see {@link DuplicateController#MAX_RETURNED_PAIRS}), plus the
 * true number of candidate pairs the engine found before capping, so the
 * frontend can show an honest "top N of total" count instead of silently
 * truncating.
 *
 * @param pairs      the highest-scoring pairs, capped
 * @param totalFound how many candidate pairs the engine found, before the cap
 */
public record DuplicatePairsResponse(List<DuplicatePair> pairs, int totalFound) {
}
