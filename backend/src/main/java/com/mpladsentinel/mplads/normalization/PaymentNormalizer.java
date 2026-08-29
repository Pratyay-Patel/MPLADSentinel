package com.mpladsentinel.mplads.normalization;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.domain.WorkPayment;
import com.mpladsentinel.mplads.source.empoweredindian.dto.PaymentInstallmentDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.WorkPaymentsResponse;
import com.mpladsentinel.mplads.source.empoweredindian.dto.WorkPaymentsSummaryDto;

/**
 * Normalises the verified {@code /works/{workId}/payments} outcomes into
 * {@link NormalizedPayments}.
 *
 * <p><strong>Pure mapping only.</strong> No HTTP, no persistence, no
 * ingestion-run creation. The owning {@link Work} and the current
 * {@link IngestionRun} are supplied by the caller (the future ingestion phase);
 * this class only maps.
 *
 * <p>The four verified payment outcomes map to four distinct results that never
 * collapse into one another:
 * <ul>
 *   <li>{@link #present} &mdash; HTTP 200, payment rows exist &rarr;
 *       {@link PaymentDataState#FETCHED_PRESENT};</li>
 *   <li>{@link #absent()} &mdash; HTTP 404 "No payment records found" &rarr;
 *       {@link PaymentDataState#FETCHED_ABSENT} (unknown / not found, NEVER &#8377;0);</li>
 *   <li>{@link #fetchError()} &mdash; 5xx / timeout / rate-limit exhausted &rarr;
 *       {@link PaymentDataState#FETCH_ERROR};</li>
 *   <li>{@link #notFetched()} &mdash; endpoint never queried &rarr;
 *       {@link PaymentDataState#NOT_FETCHED}.</li>
 * </ul>
 * A missing payment response, a fetch error and a zero payment amount are three
 * different things and are kept different.
 *
 * <p>The individual installment {@code status} is preserved as the raw source
 * string only ({@code work_payment.status_raw}); the normalised
 * {@code work_payment.status} enum is left {@code null} ("not yet normalised"),
 * which the schema keeps distinct from an explicit {@code UNKNOWN}. Mapping the
 * raw string to an enum is deferred &mdash; no payment status value other than
 * {@code "Payment Success"} has ever been observed (&sect;13.10).
 */
@Component
public class PaymentNormalizer {

    /** Length of {@code work_payment.status_raw} ({@code VARCHAR(64)}). */
    private static final int STATUS_RAW_MAX = 64;

    /**
     * A successful (HTTP 200) payments response &mdash; payment rows exist.
     *
     * @param response the verified payments payload (its {@code allPayments} is never {@code null})
     * @param work     the owning work (already identified; may be unpersisted)
     * @param run      caller-supplied provenance run (never created here)
     */
    public NormalizedPayments present(WorkPaymentsResponse response, Work work, IngestionRun run) {
        List<PaymentInstallmentDto> rows = response.allPayments();
        Set<String> flags = new LinkedHashSet<>();

        List<WorkPayment> installments = new ArrayList<>(rows.size());
        for (int ordinal = 0; ordinal < rows.size(); ordinal++) {
            installments.add(toInstallment(rows.get(ordinal), (short) ordinal, work, run, flags));
        }
        if (installments.isEmpty()) {
            flags.add(DataQualityFlags.PAYMENT_STATE_PRESENT_BUT_NO_ROWS);
        }

        WorkPaymentsSummaryDto summary = response.summary();
        BigDecimal totalPaid = null;
        Integer successfulCount = null;
        Integer pendingCount = null;
        LocalDate firstPaidOn = null;
        LocalDate lastPaidOn = null;
        Integer installmentCount;

        if (summary == null) {
            flags.add(DataQualityFlags.PAYMENT_SUMMARY_ABSENT);
            installmentCount = installments.size();
        } else {
            totalPaid = NormalizationSupport.toMoney(summary.totalAmountPaid());
            successfulCount = summary.successfulPayments();
            pendingCount = summary.pendingPayments();
            firstPaidOn = summary.firstPaymentDate();
            lastPaidOn = summary.lastPaymentDate();
            installmentCount = summary.totalInstallments() != null
                    ? summary.totalInstallments()
                    : installments.size();

            if (summary.totalInstallments() != null && summary.totalInstallments() != installments.size()) {
                flags.add(DataQualityFlags.PAYMENT_INSTALLMENT_COUNT_MISMATCH);
            }
            if (totalPaid != null && rowsSum(rows).compareTo(totalPaid) != 0) {
                flags.add(DataQualityFlags.PAYMENT_SUMMARY_TOTAL_MISMATCHES_ROWS);
            }
        }

        String schemeDescription = response.workDetails() != null
                ? NormalizationSupport.trimToNull(response.workDetails().description())
                : null;

        return new NormalizedPayments(PaymentDataState.FETCHED_PRESENT, installments, totalPaid,
                installmentCount, successfulCount, pendingCount, firstPaidOn, lastPaidOn,
                schemeDescription, new ArrayList<>(flags));
    }

    /** HTTP 404 "No payment records found for this work" &mdash; unknown / not found. Never &#8377;0. */
    public NormalizedPayments absent() {
        return NormalizedPayments.stateOnly(PaymentDataState.FETCHED_ABSENT);
    }

    /** Payments fetch failed (5xx / timeout / rate-limit exhausted). */
    public NormalizedPayments fetchError() {
        return NormalizedPayments.stateOnly(PaymentDataState.FETCH_ERROR);
    }

    /** The payments endpoint was never queried for this work. */
    public NormalizedPayments notFetched() {
        return NormalizedPayments.stateOnly(PaymentDataState.NOT_FETCHED);
    }

    private WorkPayment toInstallment(PaymentInstallmentDto dto, short ordinal, Work work,
                                      IngestionRun run, Set<String> flags) {
        BigDecimal amount = NormalizationSupport.toMoney(dto.amount());
        if (amount == null) {
            throw new NormalizationException("payment installment " + ordinal + " has no amount");
        }
        if (NormalizationSupport.exceedsMoneyScale(dto.amount())) {
            flags.add(DataQualityFlags.COST_PRECISION_EXCEEDS_DB_SCALE);
        }
        if (amount.signum() == 0) {
            flags.add(DataQualityFlags.ZERO_VALUE_PAYMENT_INSTALLMENT);
        }

        String fingerprint = NormalizationSupport.sha256Hex(String.join("|",
                Long.toString(work.getSourceWorkId()),
                NormalizationSupport.moneyToken(dto.amount()),
                dto.date() == null ? "" : dto.date().toString(),
                NormalizationSupport.token(dto.vendor()),
                NormalizationSupport.token(dto.status()),
                NormalizationSupport.token(dto.ida()),
                Short.toString(ordinal)));

        WorkPayment payment = new WorkPayment(work, amount, fingerprint, run);
        payment.setSourceOrdinal(ordinal);
        payment.setPaidOn(dto.date());
        payment.setStatusRaw(truncate(NormalizationSupport.trimToNull(dto.status())));
        // work_payment.status (normalised enum) intentionally left null here.
        payment.setVendorName(NormalizationSupport.trimToNull(dto.vendor()));
        payment.setVendorNameNormalized(NormalizationSupport.toMatchForm(dto.vendor()));
        payment.setImplementingAuthorityText(NormalizationSupport.trimToNull(dto.ida()));
        return payment;
    }

    private static BigDecimal rowsSum(List<PaymentInstallmentDto> rows) {
        BigDecimal sum = BigDecimal.ZERO.setScale(NormalizationSupport.MONEY_SCALE);
        for (PaymentInstallmentDto row : rows) {
            if (row.amount() != null) {
                sum = sum.add(NormalizationSupport.toMoney(row.amount()));
            }
        }
        return sum;
    }

    private static String truncate(String value) {
        if (value == null || value.length() <= STATUS_RAW_MAX) {
            return value;
        }
        return value.substring(0, STATUS_RAW_MAX);
    }
}
