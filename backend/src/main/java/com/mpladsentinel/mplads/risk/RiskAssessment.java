package com.mpladsentinel.mplads.risk;

import java.time.Instant;
import java.util.List;

/**
 * The risk view of one work, as returned by {@code GET /api/works/risk} and
 * {@code GET /api/works/{id}/risk}. Mirrors the frontend {@code ProjectRisk}
 * type.
 *
 * @param sourceWorkId the work's source id
 * @param level        {@link RiskLevel}
 * @param score        0–100, or {@code null} when {@code level == UNKNOWN}
 * @param reasons      human-readable contributing indicators (empty when nothing flagged)
 * @param assessedAt   when the assessment ran, or {@code null} when {@code UNKNOWN}
 */
public record RiskAssessment(
        long sourceWorkId,
        RiskLevel level,
        Integer score,
        List<String> reasons,
        Instant assessedAt
) {

    static RiskAssessment unknown(long sourceWorkId) {
        return new RiskAssessment(sourceWorkId, RiskLevel.UNKNOWN, null, List.of(), null);
    }
}
