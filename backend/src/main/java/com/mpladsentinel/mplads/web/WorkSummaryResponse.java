package com.mpladsentinel.mplads.web;

import java.util.Map;

/**
 * Aggregate counts / sums over the whole work set, for
 * {@code GET /api/works/summary}. Mirrors the frontend {@code ProjectSummary}
 * type. Every {@code LifecycleState} / {@code PaymentDataState} key is always
 * present (0 when none), so the frontend never has to guard for a missing key.
 */
public record WorkSummaryResponse(
        long totalProjects,
        Map<String, Long> byLifecycleState,
        Map<String, Long> byPaymentDataState,
        MoneyView totalEstimatedCost,
        MoneyView totalRecordedPayments
) {
}
