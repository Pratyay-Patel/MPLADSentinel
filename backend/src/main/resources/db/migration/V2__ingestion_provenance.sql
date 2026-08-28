-- V2 -- MPLADS ingestion & provenance tables.
--
-- Every externally sourced MPLADS row must be traceable to the retrieval that
-- produced it. The current (and only) source is the Empowered Indian API, which
-- is a SECONDARY data-access source, not the authoritative owner of MPLADS data
-- (see docs/data-source.md sections 1, 8 and 14). These tables carry that
-- provenance and never assert an official identifier.
--
-- Design reference: Phase 2B database/integration design, sections 2.3-2.5.
-- Enumerations are VARCHAR + CHECK, not native PostgreSQL ENUM types, so they
-- can evolve through ordinary migrations.

-- ---------------------------------------------------------------------------
-- ingestion_run -- one row per ingestion execution
-- ---------------------------------------------------------------------------
CREATE TABLE ingestion_run (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_name                 VARCHAR(32)  NOT NULL,
    endpoint                    VARCHAR(32)  NOT NULL,
    api_base_url                TEXT         NOT NULL,
    trigger_type                VARCHAR(16)  NOT NULL,
    triggered_by_user_id        BIGINT,               -- FK added in the RBAC phase
    status                      VARCHAR(16)  NOT NULL,
    started_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    finished_at                 TIMESTAMPTZ,
    page_size                   SMALLINT,
    first_page                  INTEGER,
    last_page_completed         INTEGER,
    pages_fetched               INTEGER      NOT NULL DEFAULT 0,
    records_seen                INTEGER      NOT NULL DEFAULT 0,
    records_inserted            INTEGER      NOT NULL DEFAULT 0,
    records_updated             INTEGER      NOT NULL DEFAULT 0,
    records_unchanged           INTEGER      NOT NULL DEFAULT 0,
    records_dead_lettered       INTEGER      NOT NULL DEFAULT 0,
    source_reported_total_count INTEGER,              -- diagnostics only; known to be unstable
    http_error_count            INTEGER      NOT NULL DEFAULT 0,
    retry_count                 INTEGER      NOT NULL DEFAULT 0,
    error_summary               TEXT,
    notes                       TEXT,
    CONSTRAINT ck_ingestion_run_endpoint
        CHECK (endpoint IN ('WORKS_RECOMMENDED', 'WORKS_COMPLETED', 'WORK_PAYMENTS')),
    CONSTRAINT ck_ingestion_run_trigger_type
        CHECK (trigger_type IN ('MANUAL', 'SCHEDULED')),
    CONSTRAINT ck_ingestion_run_status
        CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL'))
);

CREATE INDEX ix_ingestion_run_endpoint_started ON ingestion_run (endpoint, started_at DESC);
CREATE INDEX ix_ingestion_run_status           ON ingestion_run (status);

COMMENT ON TABLE  ingestion_run             IS 'One row per external-data ingestion execution. Source data is from Empowered Indian (a secondary source).';
COMMENT ON COLUMN ingestion_run.trigger_type IS 'Renamed from Phase 2B ''trigger'' to avoid the SQL keyword.';
COMMENT ON COLUMN ingestion_run.source_reported_total_count IS 'The pagination.totalCount reported by the source at run time. Recorded for diagnostics only; verified to vary by request shape.';

-- ---------------------------------------------------------------------------
-- raw_source_record -- verbatim latest per-record payload (Phase 2B option C, minimal)
-- ---------------------------------------------------------------------------
CREATE TABLE raw_source_record (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_name         VARCHAR(32)  NOT NULL,
    endpoint            VARCHAR(32)  NOT NULL,
    source_work_id      BIGINT,                       -- extracted (workId / work_id / path id); NULL if unextractable
    payload             JSONB        NOT NULL,
    payload_fingerprint VARCHAR(64)  NOT NULL,        -- sha-256 hex of the canonicalised payload
    http_status         SMALLINT,
    retrieved_at        TIMESTAMPTZ  NOT NULL,
    ingestion_run_id    BIGINT       NOT NULL REFERENCES ingestion_run (id),
    CONSTRAINT ck_raw_source_record_endpoint
        CHECK (endpoint IN ('WORKS_RECOMMENDED', 'WORKS_COMPLETED', 'WORK_PAYMENTS')),
    CONSTRAINT uq_raw_source_record_natural
        UNIQUE (source_name, endpoint, source_work_id)
);

CREATE INDEX ix_raw_source_record_run ON raw_source_record (ingestion_run_id);

COMMENT ON TABLE raw_source_record IS 'Latest raw payload per source record, kept so normalisation can be re-run and provenance audited without re-fetching a rate-limited third party.';

-- ---------------------------------------------------------------------------
-- ingestion_dead_letter -- records that failed validation / normalisation
-- ---------------------------------------------------------------------------
CREATE TABLE ingestion_dead_letter (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ingestion_run_id BIGINT       NOT NULL REFERENCES ingestion_run (id),
    endpoint         VARCHAR(32)  NOT NULL,
    source_work_id   BIGINT,
    raw_payload      JSONB        NOT NULL,
    error_type       VARCHAR(48)  NOT NULL,
    error_detail     TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_ingestion_dead_letter_endpoint
        CHECK (endpoint IN ('WORKS_RECOMMENDED', 'WORKS_COMPLETED', 'WORK_PAYMENTS'))
);

CREATE INDEX ix_ingestion_dead_letter_run  ON ingestion_dead_letter (ingestion_run_id);
CREATE INDEX ix_ingestion_dead_letter_type ON ingestion_dead_letter (error_type);

COMMENT ON TABLE ingestion_dead_letter IS 'Un-normalisable source records, retained so an ingestion run can continue past bad input without data loss.';
