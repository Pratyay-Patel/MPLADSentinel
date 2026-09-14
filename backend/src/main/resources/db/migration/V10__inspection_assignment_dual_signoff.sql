-- V10 -- Dual-authority sign-off for completing / cancelling an inspection
-- assignment.
--
-- Anti-corruption control: a single authority can no longer complete or
-- cancel an assignment unilaterally. The first authority calls
-- POST /api/assignments/{id}/sign-off/request, which records a pending
-- target status here WITHOUT changing the real status. A second, DIFFERENT
-- authority then calls POST /api/assignments/{id}/sign-off/confirm, which
-- finalises the real status, merges both written justifications into
-- `note`, and clears these columns. AssignmentStatus itself is deliberately
-- unchanged (still ASSIGNED / IN_PROGRESS / COMPLETED / CANCELLED) so the
-- deferred Flutter mobile contract (V8) is untouched.

ALTER TABLE inspection_assignment ADD COLUMN pending_status                 VARCHAR(16);
ALTER TABLE inspection_assignment ADD COLUMN pending_requested_by_user_id   BIGINT REFERENCES app_user (id);
ALTER TABLE inspection_assignment ADD COLUMN pending_justification         TEXT;
ALTER TABLE inspection_assignment ADD COLUMN pending_requested_at          TIMESTAMPTZ;

ALTER TABLE inspection_assignment ADD CONSTRAINT ck_inspection_assignment_pending_status
    CHECK (pending_status IS NULL OR pending_status IN ('COMPLETED', 'CANCELLED'));

-- A pending sign-off always carries who requested it and why together.
ALTER TABLE inspection_assignment ADD CONSTRAINT ck_inspection_assignment_pending_consistent
    CHECK (
        (pending_status IS NULL AND pending_requested_by_user_id IS NULL
            AND pending_justification IS NULL AND pending_requested_at IS NULL)
        OR
        (pending_status IS NOT NULL AND pending_requested_by_user_id IS NOT NULL
            AND pending_justification IS NOT NULL AND pending_requested_at IS NOT NULL)
    );

COMMENT ON COLUMN inspection_assignment.pending_status IS 'Target status (COMPLETED/CANCELLED) awaiting a second, different authority''s sign-off; NULL when nothing is pending.';
COMMENT ON COLUMN inspection_assignment.pending_requested_by_user_id IS 'Authority who requested the pending status change. The confirming authority (a different app_user) finalises it.';
COMMENT ON COLUMN inspection_assignment.pending_justification IS 'Written justification given by the requesting authority.';
COMMENT ON COLUMN inspection_assignment.pending_requested_at IS 'When the pending sign-off was requested.';
