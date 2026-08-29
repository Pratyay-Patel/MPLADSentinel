package com.mpladsentinel.mplads.ingestion;

import com.mpladsentinel.mplads.domain.IngestionRunStatus;

/**
 * Summary returned by {@link IngestionService#ingestWorkPayments()}.
 *
 * @param worksProcessed     works whose payments endpoint was queried this run
 * @param present            responses that yielded payment rows ({@code FETCHED_PRESENT})
 * @param absent             HTTP 404 "no payment records" outcomes ({@code FETCHED_ABSENT})
 * @param fetchError         fetch failures (non-2xx / transport, after client retries)
 * @param deadLettered       malformed 2xx payment payloads routed to {@code ingestion_dead_letter}
 * @param paymentRowsWritten {@code work_payment} rows written across all replaced snapshots
 */
public record PaymentsIngestionOutcome(
        long runId,
        IngestionRunStatus status,
        int worksProcessed,
        int present,
        int absent,
        int fetchError,
        int deadLettered,
        int paymentRowsWritten,
        String errorSummary) {
}
