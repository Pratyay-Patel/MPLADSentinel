package com.mpladsentinel.mplads.normalization;

import static com.mpladsentinel.mplads.normalization.NormalizationFixtures.installment;
import static com.mpladsentinel.mplads.normalization.NormalizationFixtures.paymentsResponse;
import static com.mpladsentinel.mplads.normalization.NormalizationFixtures.run;
import static com.mpladsentinel.mplads.normalization.NormalizationFixtures.summary;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.domain.WorkPayment;
import com.mpladsentinel.mplads.source.empoweredindian.dto.PaymentInstallmentDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.WorkPaymentsResponse;

class PaymentNormalizerTest {

    private final PaymentNormalizer normalizer = new PaymentNormalizer();
    private final IngestionRun run = run(IngestionEndpoint.WORK_PAYMENTS);

    private Work work(long sourceWorkId) {
        return new Work(SourceName.EMPOWERED_INDIAN, sourceWorkId,
                LifecycleState.RECOMMENDED, true, false, run);
    }

    @Test
    void mapsASinglePresentInstallmentAndRollup() {
        LocalDate day = LocalDate.of(2026, 8, 5);
        WorkPaymentsResponse response = paymentsResponse(
                summary(1, "1350689", 1, 0, day, day),
                List.of(installment("1350689", day, "Sulata Baroi")));
        Work work = work(187_484L);

        NormalizedPayments result = normalizer.present(response, work, run);

        assertThat(result.state()).isEqualTo(PaymentDataState.FETCHED_PRESENT);
        assertThat(result.totalPaid()).isEqualByComparingTo("1350689.00");
        assertThat(result.installmentCount()).isEqualTo(1);
        assertThat(result.successfulCount()).isEqualTo(1);
        assertThat(result.pendingCount()).isZero();
        assertThat(result.firstPaidOn()).isEqualTo(day);
        assertThat(result.lastPaidOn()).isEqualTo(day);
        assertThat(result.schemeDescription()).isEqualTo("Construction of community centers and community halls");
        assertThat(result.dataQualityFlags()).isEmpty();

        assertThat(result.installments()).hasSize(1);
        WorkPayment p = result.installments().get(0);
        assertThat(p.getWork()).isSameAs(work);
        assertThat(p.getAmount()).isEqualByComparingTo("1350689.00");
        assertThat(p.getAmount().scale()).isEqualTo(2);
        assertThat(p.getCurrency()).isEqualTo("INR");
        assertThat(p.getPaidOn()).isEqualTo(day);
        assertThat(p.getSourceOrdinal()).isEqualTo((short) 0);
        assertThat(p.getVendorName()).isEqualTo("Sulata Baroi");
        assertThat(p.getVendorNameNormalized()).isEqualTo("SULATA BAROI");
        assertThat(p.getImplementingAuthorityText()).contains("NORTH AND MIDDLE ANDAMAN");
        assertThat(p.getIngestionRun()).isSameAs(run);
        // status stays a RAW string; the normalised enum is left null on purpose
        assertThat(p.getStatusRaw()).isEqualTo("Payment Success");
        assertThat(p.getStatus()).isNull();
        assertThat(p.getSourceFingerprint()).hasSize(64);
    }

    @Test
    void mapsMultipleInstallmentsInOrderWithDistinctStableFingerprints() {
        WorkPaymentsResponse response = paymentsResponse(
                summary(3, "600", 3, 0, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 1)),
                List.of(
                        installment("100", LocalDate.of(2026, 1, 1), "Vendor A"),
                        installment("200", LocalDate.of(2026, 2, 1), "Vendor B"),
                        installment("300", LocalDate.of(2026, 3, 1), "Vendor C")));
        Work work = work(500L);

        NormalizedPayments first = normalizer.present(response, work, run);
        NormalizedPayments second = normalizer.present(response, work, run);

        assertThat(first.installments()).extracting(WorkPayment::getAmount)
                .containsExactly(bd("100.00"), bd("200.00"), bd("300.00"));
        assertThat(first.installments()).extracting(WorkPayment::getSourceOrdinal)
                .containsExactly((short) 0, (short) 1, (short) 2);

        List<String> fpFirst = first.installments().stream().map(WorkPayment::getSourceFingerprint).toList();
        List<String> fpSecond = second.installments().stream().map(WorkPayment::getSourceFingerprint).toList();
        assertThat(fpFirst).doesNotHaveDuplicates();
        assertThat(fpFirst).isEqualTo(fpSecond); // idempotent
        assertThat(first.dataQualityFlags()).isEmpty();
    }

    @Test
    void preservesAZeroValueInstallmentAndFlagsIt() {
        LocalDate day = LocalDate.of(2026, 5, 5);
        WorkPaymentsResponse response = paymentsResponse(
                summary(1, "0", 1, 0, day, day),
                List.of(installment("0", day, "Vendor Z")));

        NormalizedPayments result = normalizer.present(response, work(9L), run);

        assertThat(result.state()).isEqualTo(PaymentDataState.FETCHED_PRESENT);
        assertThat(result.installments()).hasSize(1);
        assertThat(result.installments().get(0).getAmount()).isEqualByComparingTo("0.00");
        assertThat(result.dataQualityFlags()).contains(DataQualityFlags.ZERO_VALUE_PAYMENT_INSTALLMENT);
    }

    @Test
    void flagsASummaryThatDisagreesWithTheRows() {
        WorkPaymentsResponse response = paymentsResponse(
                summary(5, "999", 5, 0, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2)),
                List.of(installment("100", LocalDate.of(2026, 1, 1), "V")));

        NormalizedPayments result = normalizer.present(response, work(7L), run);

        assertThat(result.dataQualityFlags()).contains(
                DataQualityFlags.PAYMENT_INSTALLMENT_COUNT_MISMATCH,
                DataQualityFlags.PAYMENT_SUMMARY_TOTAL_MISMATCHES_ROWS);
    }

    @Test
    void handlesAPresentResponseWithNoSummary() {
        WorkPaymentsResponse response = paymentsResponse(
                null,
                List.of(installment("100", LocalDate.of(2026, 1, 1), "V")));

        NormalizedPayments result = normalizer.present(response, work(8L), run);

        assertThat(result.state()).isEqualTo(PaymentDataState.FETCHED_PRESENT);
        assertThat(result.installmentCount()).isEqualTo(1);
        assertThat(result.totalPaid()).isNull();
        assertThat(result.dataQualityFlags()).contains(DataQualityFlags.PAYMENT_SUMMARY_ABSENT);
    }

    @Test
    void flagsAPresentStateThatCarriesNoRows() {
        WorkPaymentsResponse response = paymentsResponse(
                summary(0, "0", 0, 0, null, null), List.<PaymentInstallmentDto>of());

        NormalizedPayments result = normalizer.present(response, work(11L), run);

        assertThat(result.installments()).isEmpty();
        assertThat(result.dataQualityFlags()).contains(DataQualityFlags.PAYMENT_STATE_PRESENT_BUT_NO_ROWS);
    }

    @Test
    void absentIsFetchedAbsentAndNeverZero() {
        NormalizedPayments result = normalizer.absent();

        assertThat(result.state()).isEqualTo(PaymentDataState.FETCHED_ABSENT);
        assertThat(result.installments()).isEmpty();
        assertThat(result.totalPaid()).isNull();
        assertThat(result.installmentCount()).isNull();
        assertThat(result.successfulCount()).isNull();
        assertThat(result.dataQualityFlags()).isEmpty();
    }

    @Test
    void theFourPaymentStatesAreAllDistinct() {
        assertThat(normalizer.absent().state()).isEqualTo(PaymentDataState.FETCHED_ABSENT);
        assertThat(normalizer.fetchError().state()).isEqualTo(PaymentDataState.FETCH_ERROR);
        assertThat(normalizer.notFetched().state()).isEqualTo(PaymentDataState.NOT_FETCHED);

        // absent (404 no-records) and fetch-error (5xx/timeout) do not collapse into each other,
        // and neither carries an amount.
        assertThat(normalizer.absent()).isNotEqualTo(normalizer.fetchError());
        assertThat(normalizer.fetchError().totalPaid()).isNull();
        assertThat(normalizer.notFetched().totalPaid()).isNull();
    }

    private static java.math.BigDecimal bd(String v) {
        return new java.math.BigDecimal(v);
    }
}
