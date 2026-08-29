package com.mpladsentinel.mplads.normalization;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.WorkPayment;

/**
 * Result of normalising the payment side of one work.
 *
 * <p>Carries the {@link PaymentDataState} and, only for
 * {@link PaymentDataState#FETCHED_PRESENT}, the per-installment
 * {@link WorkPayment} rows plus the roll-up scalars the ingestion phase copies
 * onto {@code work.payment_*}.
 *
 * <p>The four payment states are produced by four distinct factories
 * ({@link PaymentNormalizer#present}, {@link PaymentNormalizer#absent()},
 * {@link PaymentNormalizer#fetchError()}, {@link PaymentNormalizer#notFetched()})
 * and never collapse into one another. Only a {@code present} result ever carries
 * amounts &mdash; an absent (HTTP 404 "no payment records"), errored or
 * not-fetched result leaves every monetary scalar {@code null}, meaning
 * "unknown", never "&#8377;0".
 *
 * @param state            confirmed present / confirmed absent / fetch error / not fetched
 * @param installments     per-installment rows; empty unless {@code state == FETCHED_PRESENT}
 * @param totalPaid        {@code summary.totalAmountPaid}, scaled to 2dp; {@code null} unless present with a summary
 * @param installmentCount installment count ({@code summary.totalInstallments}, else row count); {@code null} unless present
 * @param successfulCount  {@code summary.successfulPayments}; {@code null} unless present with a summary
 * @param pendingCount     {@code summary.pendingPayments}; {@code null} unless present with a summary
 * @param firstPaidOn      {@code summary.firstPaymentDate}; {@code null} unless present with a summary
 * @param lastPaidOn       {@code summary.lastPaymentDate}; {@code null} unless present with a summary
 * @param schemeDescription {@code workDetails.description} &mdash; a generic scheme work-type string, NOT the work description
 * @param dataQualityFlags descriptive flags observed while normalising the payment data
 */
public record NormalizedPayments(
        PaymentDataState state,
        List<WorkPayment> installments,
        BigDecimal totalPaid,
        Integer installmentCount,
        Integer successfulCount,
        Integer pendingCount,
        LocalDate firstPaidOn,
        LocalDate lastPaidOn,
        String schemeDescription,
        List<String> dataQualityFlags) {

    public NormalizedPayments {
        installments = installments == null ? List.of() : List.copyOf(installments);
        dataQualityFlags = dataQualityFlags == null ? List.of() : List.copyOf(dataQualityFlags);
    }

    static NormalizedPayments stateOnly(PaymentDataState state) {
        return new NormalizedPayments(state, List.of(), null, null, null, null, null, null, null, List.of());
    }
}
