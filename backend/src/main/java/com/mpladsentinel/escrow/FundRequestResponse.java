package com.mpladsentinel.escrow;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.mpladsentinel.mplads.risk.RiskLevel;

/**
 * A fund/installment request as sent to the frontend. {@code id} is a string
 * (same convention as {@code GrievanceResponse}/{@code AssignmentResponse});
 * {@code workTitle}/{@code district}/{@code requestedByName} are joined in so
 * the list screens do not need extra lookups.
 *
 * <p>{@code sanctionedAmount}, {@code alreadyReleased}, {@code remainingBeforeRequest}
 * and {@code remainingAfterRequest} reflect the work's *current* figures — they
 * are computed live, not frozen at request time, matching how risk is always
 * assessed against current data rather than a historical snapshot.
 *
 * <p>{@code riskLevel}/{@code riskReasons} are the work's current risk
 * assessment (decision D22) — shown for context; the eligibility decision
 * itself is in {@code decisionReason}.
 */
public record FundRequestResponse(
        String id,
        Long sourceWorkId,
        String workTitle,
        String district,

        String requestedByUsername,
        String requestedByName,
        BigDecimal requestedAmount,
        String remarks,
        Instant createdAt,

        BigDecimal sanctionedAmount,
        BigDecimal alreadyReleased,
        BigDecimal remainingBeforeRequest,
        BigDecimal remainingAfterRequest,

        RiskLevel riskLevel,
        List<String> riskReasons,

        FundRequestStatus status,
        String decisionReason,
        Instant decidedAt,

        boolean releaseNoticeSent,
        String releaseNoticeByName,
        Instant releaseNoticeAt,

        Instant updatedAt,
        List<FundRequestEventResponse> history
) {
}
