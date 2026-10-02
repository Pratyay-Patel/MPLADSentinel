package com.mpladsentinel.escrow;

/**
 * Escrow decision for a {@link FundRequest}. Decided once, synchronously, by
 * {@link FundEligibilityEngine} at creation time — there is deliberately no
 * {@code PENDING} / {@code UNDER_REVIEW} terminal state and no manual
 * MoSPI approve/reject action.
 */
public enum FundRequestStatus {
    APPROVED,
    REJECTED
}
