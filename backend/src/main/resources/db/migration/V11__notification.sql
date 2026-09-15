-- V11 -- In-app notifications: the header bell feed and the "Send Notice"
-- action for high-risk / attention-needed works.
--
-- Two ways a row gets created (NotificationService):
--   1. An authority sends an attention notice for a specific work (POST
--      /api/notifications/send-notice) -- always addressed to the single
--      seeded District Authority account, since per-district accounts do not
--      exist yet (seeded-users-only, decision D31).
--   2. The backend seeds a handful of real HIGH-risk-work alerts for an
--      authority the first time they load their notifications, reusing the
--      existing rule-based RiskEngine (D22) -- never fabricated data.
--
-- "Clear all" does not delete rows -- it sets dismissed = true so the row is
-- retained even though the frontend feed empties.

CREATE TABLE notification (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient_user_id    BIGINT       NOT NULL REFERENCES app_user (id),
    category             VARCHAR(24)  NOT NULL,
    title                VARCHAR(200) NOT NULL,
    message              TEXT         NOT NULL,
    source_work_id       BIGINT,                  -- a source work id, or NULL; not a FK (see grievance.work_reference)
    is_read              BOOLEAN      NOT NULL DEFAULT FALSE,
    dismissed            BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT ck_notification_category CHECK (category IN ('HIGH_RISK_WORK', 'SLA_NOTICE'))
);

CREATE INDEX ix_notification_recipient ON notification (recipient_user_id, dismissed, created_at DESC);

COMMENT ON TABLE  notification IS 'In-app notifications (header bell) -- SLA/attention notices and real high-risk-work alerts.';
COMMENT ON COLUMN notification.source_work_id IS 'Source work id the notification is about, or NULL. Deliberately not a FK.';
COMMENT ON COLUMN notification.dismissed IS '"Clear all" sets this rather than deleting -- the row is retained, just hidden from the feed.';
