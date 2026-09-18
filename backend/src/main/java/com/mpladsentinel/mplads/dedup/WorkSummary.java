package com.mpladsentinel.mplads.dedup;

import java.math.BigDecimal;

/**
 * A lightweight view of one side of a {@link DuplicatePair} — enough for the
 * review screen to display without a second fetch per work.
 */
public record WorkSummary(
        long sourceWorkId,
        String workDescription,
        String state,
        String district,
        String category,
        BigDecimal estimatedCost
) {
}
