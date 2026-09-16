package com.mpladsentinel.escrow;

/**
 * One entry in a {@link FundRequest}'s chronological history
 * ({@link FundRequestEvent}). Mirrors the "Future Blockchain Concept" event
 * list in the feature spec exactly, so the future ledger-mapping phase can
 * map these rows onto transactions one-to-one without a data-model change.
 */
public enum FundRequestEventType {
    CREATED,
    APPROVED,
    REJECTED,
    RELEASE_NOTICE_SENT
}
