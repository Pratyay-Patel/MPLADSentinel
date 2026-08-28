package com.mpladsentinel.mplads.domain;

/**
 * Lifecycle status of an {@link IngestionRun}. Names match the
 * {@code ck_ingestion_run_status} check constraint.
 */
public enum IngestionRunStatus {
    RUNNING,
    SUCCEEDED,
    FAILED,
    PARTIAL
}
