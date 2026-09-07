-- V9 -- Per-inspection field-evidence photo count.
--
-- Different inspections need different amounts of photographic verification, so
-- the authority sets how many the Audit Trail should surface when creating the
-- assignment (editable afterwards via PATCH /api/assignments/{id}). The Audit
-- Trail passes this as the `limit` to GET /api/audit/{workId}/photos.
--
-- Default 2 keeps existing rows and the prior behaviour (mplads.pinata
-- .evidence-limit) unchanged.

ALTER TABLE inspection_assignment
    ADD COLUMN required_photos SMALLINT NOT NULL DEFAULT 2;

ALTER TABLE inspection_assignment
    ADD CONSTRAINT ck_inspection_assignment_required_photos
    CHECK (required_photos BETWEEN 1 AND 20);

COMMENT ON COLUMN inspection_assignment.required_photos IS 'How many field-evidence photos this inspection calls for (1-20). Used as the limit when the Audit Trail fetches images from Pinata.';
