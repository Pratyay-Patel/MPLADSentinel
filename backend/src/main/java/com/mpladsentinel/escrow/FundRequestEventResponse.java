package com.mpladsentinel.escrow;

import java.time.Instant;

/** One entry in a fund request's chronological history, as sent to the frontend. */
public record FundRequestEventResponse(
        FundRequestEventType eventType,
        Instant occurredAt,
        String actorName,
        String detail
) {
}
