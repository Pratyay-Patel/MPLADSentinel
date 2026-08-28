package com.mpladsentinel.mplads.domain;

/**
 * How an {@link IngestionRun} was started. Stored in
 * {@code ingestion_run.trigger_type} (renamed from the Phase 2B name
 * {@code trigger} to avoid the SQL keyword). Names match the
 * {@code ck_ingestion_run_trigger_type} check constraint.
 */
public enum IngestionTrigger {
    MANUAL,
    SCHEDULED
}
