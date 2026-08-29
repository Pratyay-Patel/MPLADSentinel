package com.mpladsentinel.mplads.ingestion;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;

/**
 * Summary returned by {@link IngestionService#ingestRecommendedWorks()} /
 * {@link IngestionService#ingestCompletedWorks()}. Mirrors the persisted
 * {@code ingestion_run} counters for the caller / tests; the run row remains the
 * authoritative record.
 *
 * @param deadLettersSuppressed un-normalisable records beyond {@code deadLetterCapPerRun}
 *                              that were counted but not written (Q5)
 */
public record WorksIngestionOutcome(
        long runId,
        IngestionEndpoint endpoint,
        IngestionRunStatus status,
        int pagesFetched,
        int recordsSeen,
        int recordsInserted,
        int recordsUpdated,
        int recordsUnchanged,
        int recordsDeadLettered,
        int deadLettersSuppressed,
        int httpErrorCount,
        String errorSummary) {
}
