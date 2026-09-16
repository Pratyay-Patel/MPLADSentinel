-- V13 -- Escrow & Fund Control: District Officer installment requests, an
-- automatic rule-based eligibility decision, and the MoSPI/Ministry
-- "release notice to bank" action.
--
-- Decision flow (see docs/decisions.md): a District Officer requests an
-- installment for a work; the request is decided APPROVED or REJECTED
-- immediately by a deterministic, explainable rule engine (same style as the
-- Round-1 RiskEngine, D22) -- there is no manual MoSPI approve/reject step.
-- The Ministry Authority only reviews outcomes and, for an APPROVED request,
-- can record that a release notice was sent to the bank -- a database flag
-- only, never a real bank transaction (see the class-level Javadoc on the
-- Java service for the full list of things deliberately NOT implemented:
-- no Hyperledger Fabric, no chaincode, no wallets, no bank APIs).
--
-- fund_request_event is a dedicated append-only history table (unlike
-- inspection_assignment, which reuses a single updated_at and loses
-- intermediate transition times) because this feature explicitly needs a
-- full chronological trail, and because the future blockchain layer will map
-- these same event rows onto ledger transactions one-to-one.

CREATE TABLE fund_request (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- which work the installment is requested for. A source work id, NOT a
    -- FK -- the referenced work may not be ingested (same rule as
    -- grievance.work_reference / inspection_assignment.source_work_id).
    source_work_id              BIGINT        NOT NULL,

    requested_by_user_id        BIGINT        NOT NULL REFERENCES app_user (id),
    requested_amount            NUMERIC(15,2) NOT NULL,
    remarks                     TEXT,

    -- decided automatically, synchronously, at creation time -- see
    -- FundEligibilityEngine. No UNDER_REVIEW / PENDING terminal state.
    status                      VARCHAR(16)   NOT NULL,
    decision_reason             TEXT          NOT NULL,
    decided_at                  TIMESTAMPTZ   NOT NULL,

    -- "Send Release Notice to Bank" -- MoSPI only, APPROVED requests only,
    -- database bookkeeping only (no bank integration).
    release_notice_sent         BOOLEAN       NOT NULL DEFAULT FALSE,
    release_notice_by_user_id   BIGINT        REFERENCES app_user (id),
    release_notice_at           TIMESTAMPTZ,

    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT ck_fund_request_amount_positive CHECK (requested_amount > 0),
    CONSTRAINT ck_fund_request_status CHECK (status IN ('APPROVED', 'REJECTED')),
    CONSTRAINT ck_fund_request_release_notice_only_approved
        CHECK (NOT release_notice_sent OR status = 'APPROVED'),
    CONSTRAINT ck_fund_request_release_notice_fields
        CHECK (
            (NOT release_notice_sent AND release_notice_by_user_id IS NULL AND release_notice_at IS NULL)
            OR (release_notice_sent AND release_notice_by_user_id IS NOT NULL AND release_notice_at IS NOT NULL)
        )
);

CREATE INDEX ix_fund_request_source_work_id ON fund_request (source_work_id, created_at DESC);
CREATE INDEX ix_fund_request_requested_by ON fund_request (requested_by_user_id, created_at DESC);
CREATE INDEX ix_fund_request_status ON fund_request (status);

CREATE TABLE fund_request_event (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fund_request_id   BIGINT       NOT NULL REFERENCES fund_request (id),
    event_type        VARCHAR(24)  NOT NULL,
    actor_user_id     BIGINT       REFERENCES app_user (id),
    detail            TEXT,
    occurred_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT ck_fund_request_event_type
        CHECK (event_type IN ('CREATED', 'APPROVED', 'REJECTED', 'RELEASE_NOTICE_SENT'))
);

CREATE INDEX ix_fund_request_event_request ON fund_request_event (fund_request_id, occurred_at);

COMMENT ON TABLE  fund_request IS 'Escrow & Fund Control: a District Officer''s installment request, decided APPROVED/REJECTED automatically by a rule-based eligibility engine. User-generated application data -- not MPLADS source data.';
COMMENT ON COLUMN fund_request.source_work_id IS 'Work the installment is requested for. A source work id, deliberately not a FK -- the work may not be ingested.';
COMMENT ON COLUMN fund_request.status IS 'Decided synchronously at creation by FundEligibilityEngine -- no manual approve/reject step, no UNDER_REVIEW state.';
COMMENT ON COLUMN fund_request.decision_reason IS 'Human-readable explanation of the automatic decision (which rule matched or passed). Always present.';
COMMENT ON COLUMN fund_request.release_notice_sent IS '"Sent" is a database flag only -- no real bank integration exists or is planned for this phase.';
COMMENT ON TABLE  fund_request_event IS 'Append-only chronological history for one fund_request. Future blockchain phase maps these rows 1:1 onto ledger transactions; for now PostgreSQL is the sole source of truth.';
