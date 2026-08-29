-- V4 -- MPLADS work payments (individual installment rows).
--
-- Rows come from GET /api/works/{workId}/payments -> data.allPayments[].
-- A work may have zero, one or many payment rows. The ABSENCE of rows must not
-- be read as zero expenditure; the distinction between
--   confirmed present / confirmed absent / not fetched / fetch error
-- is carried by work.payment_data_state (see V3), not by row count alone.
--
-- The source provides no payment identifier, so idempotency uses a content
-- fingerprint over the verified payment fields plus the array position.
--
-- Design reference: Phase 2B database/integration design, section 2.2.

CREATE TABLE work_payment (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_id                     BIGINT        NOT NULL REFERENCES work (id) ON DELETE CASCADE,
    source_ordinal              SMALLINT,                   -- position within allPayments[] as returned (may be unstable)
    amount                      NUMERIC(15, 2) NOT NULL,
    currency                    VARCHAR(3)    NOT NULL DEFAULT 'INR',
    paid_on                     DATE,                       -- day precision
    status_raw                  VARCHAR(64),                -- verbatim, e.g. 'Payment Success' (only value observed)
    status                      VARCHAR(16),                -- normalised; NULL = not yet normalised / unknown
    vendor_name                 VARCHAR(256),
    vendor_name_normalized      VARCHAR(256),
    implementing_authority_text TEXT,                       -- from allPayments[].ida
    source_fingerprint          VARCHAR(64)   NOT NULL,     -- sha-256 hex over (work_id|amount|paid_on|vendor|status_raw|ida|source_ordinal)
    ingestion_run_id            BIGINT        NOT NULL REFERENCES ingestion_run (id),
    ingested_at                 TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_work_payment_natural
        UNIQUE (work_id, source_fingerprint),
    CONSTRAINT ck_work_payment_amount_nonneg
        CHECK (amount >= 0),
    CONSTRAINT ck_work_payment_status
        CHECK (status IS NULL OR status IN ('SUCCESS', 'PENDING', 'UNKNOWN'))
);

-- Payment-to-work lookup is served by the leading column of uq_work_payment_natural
-- (work_id, source_fingerprint); no separate index is added to avoid redundancy.

COMMENT ON TABLE  work_payment IS 'Individual MPLADS payment installments for a work. Zero rows does NOT imply zero expenditure -- consult work.payment_data_state.';
COMMENT ON COLUMN work_payment.source_fingerprint IS 'Stable content hash used for idempotent upsert; the source exposes no payment identifier.';
COMMENT ON COLUMN work_payment.status IS 'Normalised payment status. NULL means not yet normalised / unknown, which is distinct from the explicit UNKNOWN value.';
