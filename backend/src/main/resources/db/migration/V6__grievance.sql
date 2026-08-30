-- V6 -- Citizen grievances against MPLADS works.
--
-- User-generated application data (not ingested MPLADS source data). A citizen
-- raises a grievance from the Citizen Portal; MoSPI / State / District
-- authorities review it and move it through
--   SUBMITTED -> UNDER_REVIEW -> ACTIONED -> CLOSED
-- with an optional action note. Auditor / MP see the queue read-only.
--
-- Round 1 scope (docs/round1-scope.md P1.5): no attachments, no threaded
-- replies, no notifications. A citizen sees only their own grievances; every
-- other role sees all.

CREATE TABLE grievance (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- what the citizen filled in
    work_reference       BIGINT,                       -- a source work id, or NULL for a general grievance;
                                                       -- NOT a FK -- the referenced work may not be ingested
    category             VARCHAR(64)   NOT NULL,
    subject              VARCHAR(200)  NOT NULL,
    description          TEXT          NOT NULL,
    contact_name         VARCHAR(128),
    contact_email        VARCHAR(256),

    -- who raised it (from the authenticated session); NULL only for seed/test rows
    submitted_by_user_id BIGINT        REFERENCES app_user (id),

    -- review state
    status               VARCHAR(16)   NOT NULL DEFAULT 'SUBMITTED',
    action_note          TEXT,

    submitted_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT ck_grievance_category CHECK (category IN (
        'Quality of work', 'Delay in execution', 'Work not started',
        'Suspected misuse of funds', 'Wrong location or beneficiary', 'Other')),
    CONSTRAINT ck_grievance_status CHECK (status IN (
        'SUBMITTED', 'UNDER_REVIEW', 'ACTIONED', 'CLOSED'))
);

-- Citizen "my grievances" lookup, newest first.
CREATE INDEX ix_grievance_submitted_by ON grievance (submitted_by_user_id, submitted_at DESC);

COMMENT ON TABLE  grievance IS 'Citizen grievances against MPLADS works. User-generated; not MPLADS source data.';
COMMENT ON COLUMN grievance.work_reference IS 'Source work id the grievance is about, or NULL. Deliberately not a FK.';
COMMENT ON COLUMN grievance.submitted_by_user_id IS 'app_user.id of the citizen who raised it (from the session).';
