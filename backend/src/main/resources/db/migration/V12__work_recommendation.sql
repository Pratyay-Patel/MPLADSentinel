-- V12 -- Citizen work recommendations (e-SAKSHI-style "recommend a work").
--
-- User-generated application data (not ingested MPLADS source data). A citizen
-- proposes a locally-felt work for their MP to consider; MoSPI / State /
-- District review it and move it through
--   SUBMITTED -> UNDER_REVIEW -> RECOMMENDED / REJECTED
-- with an optional action note. Auditor / MP see the queue read-only, mirroring
-- the grievance workflow (V6).
--
-- Deliberately not a FK to any MP/constituency table -- the state/MP/
-- constituency values come from the citizen-visible public works list
-- (real ingested data), not a separate MP registry that doesn't exist yet.

CREATE TABLE work_recommendation (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- who is asking (as filled into the form -- not necessarily the account holder)
    full_name             VARCHAR(128)  NOT NULL,
    mobile_number         VARCHAR(16)   NOT NULL,
    email                 VARCHAR(256),

    -- where
    state                 VARCHAR(64)   NOT NULL,
    mp_name               VARCHAR(128)  NOT NULL,
    constituency          VARCHAR(128)  NOT NULL,
    location_category     VARCHAR(8)    NOT NULL,
    gps_coordinates_link  TEXT          NOT NULL,

    -- what
    work_title            VARCHAR(200)  NOT NULL,
    category              VARCHAR(64)   NOT NULL,
    description           TEXT          NOT NULL,

    -- who raised it (from the authenticated session); NULL only for seed/test rows
    submitted_by_user_id  BIGINT        REFERENCES app_user (id),

    tracking_number       VARCHAR(32)   NOT NULL,

    status                VARCHAR(16)   NOT NULL DEFAULT 'SUBMITTED',
    action_note           TEXT,

    submitted_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_work_recommendation_tracking_number UNIQUE (tracking_number),
    CONSTRAINT ck_work_recommendation_location_category CHECK (location_category IN ('RURAL', 'URBAN')),
    CONSTRAINT ck_work_recommendation_status CHECK (status IN (
        'SUBMITTED', 'UNDER_REVIEW', 'RECOMMENDED', 'REJECTED')),
    CONSTRAINT ck_work_recommendation_category CHECK (category IN (
        'Drinking Water & Sanitation', 'Roads & Transportation', 'Education Infrastructure',
        'Health Infrastructure', 'Community & Public Buildings', 'Sports Infrastructure',
        'Irrigation & Agriculture', 'Electricity & Non-conventional Energy', 'Other'))
);

-- Citizen "my recommendations" lookup, newest first.
CREATE INDEX ix_work_recommendation_submitted_by ON work_recommendation (submitted_by_user_id, submitted_at DESC);

COMMENT ON TABLE  work_recommendation IS 'Citizen work recommendations (e-SAKSHI-style). User-generated; not MPLADS source data.';
COMMENT ON COLUMN work_recommendation.gps_coordinates_link IS 'A maps link or lat,lng pair for the proposed site, in place of free-text locality — harder to fake than a written description.';
COMMENT ON COLUMN work_recommendation.mp_name IS 'Chosen from the real, state-filtered MP list derived from ingested works; not cross-validated server-side yet (documented limitation, mirrors grievance.work_reference).';
COMMENT ON COLUMN work_recommendation.tracking_number IS 'Citizen-facing acknowledgement code, e.g. CIT-2026-000042.';
