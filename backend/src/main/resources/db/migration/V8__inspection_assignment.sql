-- V8 -- Field-officer accounts and work -> officer inspection assignments.
--
-- Portal-side slice of docs/portal-app-integration-plan.md: an authority
-- (MoSPI / State / District) asks a field officer to inspect a specific MPLADS
-- work. The assignment is persisted here and shown as a verification trail on
-- the Audit page. User-generated application data -- not ingested MPLADS source
-- data.
--
-- Deliberately NOT in this migration (deferred, see the plan doc): the mobile
-- channel's field_inspection / field_inspection_photo tables, IPFS CIDs, the
-- canonical-JSON payload, and any Hyperledger Fabric anchoring. The status
-- vocabulary below matches the parent contract so those attach without a
-- schema rewrite.

-- --- Field-officer identity on the existing login-account table -------------
-- Field officers are app_user rows with role FIELD_OFFICER, authority-
-- provisioned only (same rule as the other government roles -- no self-
-- registration). officer_code is the stable string id the Flutter app already
-- uses (e.g. 'OFF102'); phone is editable by the officer from the app later.
-- Both columns are populated ONLY for FIELD_OFFICER rows.

ALTER TABLE app_user ADD COLUMN officer_code VARCHAR(16);
ALTER TABLE app_user ADD COLUMN phone        VARCHAR(32);

ALTER TABLE app_user ADD CONSTRAINT uq_app_user_officer_code UNIQUE (officer_code);

ALTER TABLE app_user DROP CONSTRAINT ck_app_user_role;
ALTER TABLE app_user ADD  CONSTRAINT ck_app_user_role
    CHECK (role IN ('MOSPI', 'STATE', 'DISTRICT', 'AUDITOR', 'MP', 'CITIZEN', 'FIELD_OFFICER'));

COMMENT ON COLUMN app_user.officer_code IS 'Stable field-officer id used by the Flutter app (e.g. OFF102). Populated only for FIELD_OFFICER rows.';
COMMENT ON COLUMN app_user.phone IS 'Field-officer contact number. Populated only for FIELD_OFFICER rows.';

-- --- Inspection assignment -------------------------------------------------
CREATE TABLE inspection_assignment (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- which work is to be inspected. A source work id, NOT a FK -- the
    -- referenced work may not be ingested (same rule as grievance.work_reference).
    source_work_id        BIGINT        NOT NULL,

    -- who inspects, and who asked for it
    officer_id            BIGINT        NOT NULL REFERENCES app_user (id),
    assigned_by_user_id   BIGINT        NOT NULL REFERENCES app_user (id),

    -- lifecycle: ASSIGNED -> IN_PROGRESS -> COMPLETED, or CANCELLED
    status                VARCHAR(16)   NOT NULL DEFAULT 'ASSIGNED',

    due_date              DATE,
    note                  TEXT,

    assigned_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT ck_inspection_assignment_status
        CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

-- At most one OPEN (ASSIGNED / IN_PROGRESS) assignment per work + officer.
-- Re-assigning after a closed one creates a fresh row.
CREATE UNIQUE INDEX uq_inspection_assignment_open
    ON inspection_assignment (source_work_id, officer_id)
    WHERE status IN ('ASSIGNED', 'IN_PROGRESS');

CREATE INDEX ix_inspection_assignment_work
    ON inspection_assignment (source_work_id, assigned_at DESC);
CREATE INDEX ix_inspection_assignment_officer
    ON inspection_assignment (officer_id, assigned_at DESC);

COMMENT ON TABLE  inspection_assignment IS 'Authority-requested field inspection of an MPLADS work. User-generated; not MPLADS source data. Feeds the Audit verification trail (from PostgreSQL, not blockchain).';
COMMENT ON COLUMN inspection_assignment.source_work_id IS 'Work to inspect. A source work id, deliberately not a FK -- the work may not be ingested.';
COMMENT ON COLUMN inspection_assignment.status IS 'ASSIGNED = requested; IN_PROGRESS = officer working; COMPLETED = inspection recorded; CANCELLED = withdrawn by an authority.';
