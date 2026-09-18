package com.mpladsentinel.mplads.dedup;

/**
 * Confidence banding for a {@link DuplicatePair}. Mirrors the frontend
 * {@code DuplicateConfidence} union.
 *
 * <p>Like {@link com.mpladsentinel.mplads.risk.RiskLevel}, these are
 * investigation indicators, never proof that two records are actually the
 * same work.
 */
public enum DuplicateConfidence {
    LOW,
    MEDIUM,
    HIGH;

    /** Score → band. A pair is only ever produced with score &gt; 0. */
    static DuplicateConfidence forScore(int score) {
        if (score >= 60) {
            return HIGH;
        }
        if (score >= 30) {
            return MEDIUM;
        }
        return LOW;
    }
}
