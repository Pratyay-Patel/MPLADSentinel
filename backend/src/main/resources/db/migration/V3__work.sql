-- V3 -- MPLADS work / "project" (normalised internal representation).
--
-- One row per logical MPLADS work, assembled from the Empowered Indian
-- /works/recommended and/or /works/completed endpoints. The numeric
-- source_work_id is the source's identifier; its relationship to any official
-- MPLADS / e-SAKSHI identifier is UNKNOWN (docs/data-source.md 13.10, 14.3), so
-- it is never labelled as an official id.
--
-- Deliberately absent (no accessible source provides them at work level -- see
-- docs/data-source.md section 14): sanctioned_amount, sanction_number,
-- sanction_date, physical_progress_pct.
--
-- Design reference: Phase 2B database/integration design, section 2.1.

CREATE TABLE work (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- identity / source
    source_name                 VARCHAR(32)   NOT NULL DEFAULT 'EMPOWERED_INDIAN',
    source_work_id              BIGINT        NOT NULL,

    -- descriptive
    work_description            TEXT,
    category                    VARCHAR(128),
    category_normalized         VARCHAR(128),
    house                       VARCHAR(16),
    ls_term                     SMALLINT,
    mp_name                     VARCHAR(256),
    mp_name_normalized          VARCHAR(256),
    constituency                VARCHAR(256),
    constituency_normalized     VARCHAR(256),
    state                       VARCHAR(128),
    state_normalized            VARCHAR(128),
    district                    VARCHAR(128),
    district_normalized         VARCHAR(128),
    location_raw                TEXT,
    implementing_authority_text TEXT,                       -- best-effort, derived; NULL if not confidently parseable

    -- financial (kept as two distinct concepts; never merged)
    estimated_cost              NUMERIC(15, 2),             -- from /recommended estimated_cost
    final_cost                  NUMERIC(15, 2),             -- from /completed cost
    currency                    VARCHAR(3)    NOT NULL DEFAULT 'INR',

    -- temporal (day precision -- source dates carry no meaningful time component)
    recommended_on              DATE,
    recommended_year            SMALLINT,
    completed_on                DATE,
    completion_year             SMALLINT,

    -- status / lifecycle (descriptive of observed endpoint presence, NOT a proven transition)
    source_status_raw           VARCHAR(64),                -- verbatim; only 'Recommended' has ever been seen
    expected_beneficiaries      INTEGER,                    -- literal source value; 0 in 100% of samples (see data_quality_flags)
    seen_in_recommended         BOOLEAN       NOT NULL DEFAULT FALSE,
    seen_in_completed           BOOLEAN       NOT NULL DEFAULT FALSE,
    lifecycle_state             VARCHAR(28)   NOT NULL,

    -- payment signal carried inline on /recommended (cheap; not authoritative)
    rec_has_payments            BOOLEAN,
    rec_total_paid              NUMERIC(15, 2),
    rec_payment_count           INTEGER,

    -- payment rollup from the /works/{id}/payments endpoint
    payment_data_state          VARCHAR(16)   NOT NULL DEFAULT 'NOT_FETCHED',
    payment_total_paid          NUMERIC(15, 2),
    payment_installments        INTEGER,
    payment_successful_count    INTEGER,
    payment_pending_count       INTEGER,
    payment_first_on            DATE,
    payment_last_on             DATE,
    payment_scheme_description   TEXT,                      -- generic scheme work-type text from payments; NOT the work description

    -- data quality
    data_quality_flags          TEXT[]        NOT NULL DEFAULT '{}',

    -- provenance
    source_response_at          TIMESTAMPTZ,               -- source 'lastUpdated' == response time, not data freshness
    first_ingested_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    last_ingested_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    last_ingestion_run_id       BIGINT        NOT NULL REFERENCES ingestion_run (id),

    -- row audit
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_work_source_natural
        UNIQUE (source_name, source_work_id),
    CONSTRAINT ck_work_house
        CHECK (house IS NULL OR house IN ('LOK_SABHA', 'RAJYA_SABHA')),
    CONSTRAINT ck_work_lifecycle_state
        CHECK (lifecycle_state IN ('RECOMMENDED', 'COMPLETED', 'RECOMMENDED_AND_COMPLETED')),
    CONSTRAINT ck_work_payment_data_state
        CHECK (payment_data_state IN ('NOT_FETCHED', 'FETCHED_PRESENT', 'FETCHED_ABSENT', 'FETCH_ERROR')),
    CONSTRAINT ck_work_seen_somewhere
        CHECK (seen_in_recommended OR seen_in_completed),
    CONSTRAINT ck_work_estimated_cost_nonneg
        CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    CONSTRAINT ck_work_final_cost_nonneg
        CHECK (final_cost IS NULL OR final_cost >= 0),
    CONSTRAINT ck_work_payment_total_paid_nonneg
        CHECK (payment_total_paid IS NULL OR payment_total_paid >= 0)
);

-- Indexes: work + work-id lookup, and the dashboard/query dimensions named in
-- the Phase 2C brief (state, district, constituency, MP, status, dates).
CREATE INDEX ix_work_source_work_id          ON work (source_work_id);
CREATE INDEX ix_work_state_normalized        ON work (state_normalized);
CREATE INDEX ix_work_district_normalized     ON work (district_normalized);
CREATE INDEX ix_work_constituency_normalized ON work (constituency_normalized);
CREATE INDEX ix_work_mp_name_normalized      ON work (mp_name_normalized);
CREATE INDEX ix_work_lifecycle_state         ON work (lifecycle_state);
CREATE INDEX ix_work_recommended_on          ON work (recommended_on);
CREATE INDEX ix_work_completed_on            ON work (completed_on);

COMMENT ON TABLE  work IS 'Unified MPLADS work assembled from the Empowered Indian recommended/completed endpoints. source_work_id is a source identifier of unknown official provenance.';
COMMENT ON COLUMN work.lifecycle_state IS 'Derived from seen_in_recommended / seen_in_completed. RECOMMENDED_AND_COMPLETED is a data-quality anomaly, not proof of a lifecycle transition.';
COMMENT ON COLUMN work.payment_data_state IS 'NOT_FETCHED = payments never queried; FETCHED_PRESENT = payment rows found; FETCHED_ABSENT = payments endpoint returned 404 no-records (NOT the same as zero expenditure); FETCH_ERROR = fetch failed.';
COMMENT ON COLUMN work.expected_beneficiaries IS 'Stored verbatim; observed 0 in every sampled record. Do not read 0 as a real measurement.';
