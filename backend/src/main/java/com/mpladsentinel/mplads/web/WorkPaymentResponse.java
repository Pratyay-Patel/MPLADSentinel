package com.mpladsentinel.mplads.web;

import java.time.LocalDate;

import com.mpladsentinel.mplads.domain.WorkPayment;

/**
 * One payment installment for a work, for {@code GET /api/works/{id}/payments}.
 * Mirrors the frontend {@code PaymentInstallment} type. Only the raw source
 * status string is exposed ({@code statusRaw}) — no normalised status.
 */
public record WorkPaymentResponse(
        int ordinal,
        MoneyView amount,
        LocalDate paidOn,
        String vendorName,
        String statusRaw,
        String implementingAuthorityText
) {

    static WorkPaymentResponse from(WorkPayment payment, int fallbackOrdinal) {
        Short ordinal = payment.getSourceOrdinal();
        return new WorkPaymentResponse(
                ordinal != null ? ordinal.intValue() : fallbackOrdinal,
                MoneyView.of(payment.getAmount(), payment.getCurrency()),
                payment.getPaidOn(),
                payment.getVendorName(),
                payment.getStatusRaw(),
                payment.getImplementingAuthorityText());
    }
}
