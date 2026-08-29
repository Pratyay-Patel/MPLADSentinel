package com.mpladsentinel.mplads.domain;

/**
 * The source endpoint an ingestion run / raw record / dead letter relates to.
 * Names match the {@code endpoint} check constraints on {@code ingestion_run},
 * {@code raw_source_record} and {@code ingestion_dead_letter}.
 */
public enum IngestionEndpoint {
    WORKS_RECOMMENDED,
    WORKS_COMPLETED,
    WORK_PAYMENTS
}
