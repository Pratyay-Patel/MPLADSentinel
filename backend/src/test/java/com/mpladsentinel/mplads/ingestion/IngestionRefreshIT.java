package com.mpladsentinel.mplads.ingestion;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkPaymentRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;

/**
 * Payment recheck / snapshot-replacement behaviour (Q1, Q2, Q6). The recheck
 * windows are shrunk so a just-processed work is immediately eligible again.
 */
@TestPropertySource(properties = {
        "mplads.ingestion.payments-recheck-absent-after=1ms",
        "mplads.ingestion.payments-recheck-present-after=1ms"
})
class IngestionRefreshIT extends AbstractIngestionIntegrationTest {

    @Autowired
    private WorkRepository workRepository;
    @Autowired
    private WorkPaymentRepository workPaymentRepository;

    private Work seedWork(long sourceWorkId) {
        enqueue(ok(IngestionJson.recommendedPage(1, 1, 1, false,
                IngestionJson.recommendedWork(sourceWorkId, "Seed " + sourceWorkId, 100))));
        ingestionService.ingestRecommendedWorks();
        return workRepository.findBySourceNameAndSourceWorkId(SourceName.EMPOWERED_INDIAN, sourceWorkId)
                .orElseThrow();
    }

    @Test
    void aSuccessfulRefetchReplacesTheStalePaymentRows() {
        Work work = seedWork(310001);
        enqueue(ok(IngestionJson.paymentsPresent(310001, List.of(new long[] {100, 5}, new long[] {200, 6}))));
        ingestionService.ingestWorkPayments();
        assertThat(workPaymentRepository.countByWorkId(work.getId())).isEqualTo(2);

        enqueue(ok(IngestionJson.paymentsPresent(310001, List.of(new long[] {999, 7}))));
        PaymentsIngestionOutcome second = ingestionService.ingestWorkPayments();

        assertThat(second.worksProcessed()).isEqualTo(1);
        assertThat(second.present()).isEqualTo(1);
        assertThat(workPaymentRepository.countByWorkId(work.getId())).isEqualTo(1); // 2 stale rows replaced
        Work reread = workRepository.findById(work.getId()).orElseThrow();
        assertThat(reread.getPaymentTotalPaid()).isEqualByComparingTo("999.00");
        assertThat(reread.getPaymentInstallments()).isEqualTo(1);
    }

    @Test
    void aFailedRefetchKeepsThePreviousSuccessfulSnapshot() {
        Work work = seedWork(320001);
        enqueue(ok(IngestionJson.paymentsPresent(320001, List.of(new long[] {100, 5}, new long[] {200, 6}))));
        ingestionService.ingestWorkPayments();

        enqueue(json(500, "{\"error\":\"transient\"}"));
        PaymentsIngestionOutcome second = ingestionService.ingestWorkPayments();

        assertThat(second.status()).isEqualTo(IngestionRunStatus.PARTIAL);
        assertThat(second.fetchError()).isEqualTo(1);
        Work reread = workRepository.findById(work.getId()).orElseThrow();
        assertThat(reread.getPaymentDataState()).isEqualTo(PaymentDataState.FETCHED_PRESENT); // NOT downgraded
        assertThat(workPaymentRepository.countByWorkId(work.getId())).isEqualTo(2);           // rows intact
        assertThat(reread.getPaymentTotalPaid()).isEqualByComparingTo("300.00");
    }

    @Test
    void aFetchedAbsentWorkIsRecheckedAndCanBecomePresent() {
        Work work = seedWork(330001);
        enqueue(json(404, IngestionJson.PAYMENTS_404_NO_RECORDS));
        ingestionService.ingestWorkPayments();
        assertThat(workRepository.findById(work.getId()).orElseThrow().getPaymentDataState())
                .isEqualTo(PaymentDataState.FETCHED_ABSENT);

        enqueue(ok(IngestionJson.paymentsPresent(330001, List.of(new long[] {500, 9}))));
        PaymentsIngestionOutcome second = ingestionService.ingestWorkPayments();

        assertThat(second.worksProcessed()).isEqualTo(1); // FETCHED_ABSENT was eligible again
        assertThat(second.present()).isEqualTo(1);
        Work reread = workRepository.findById(work.getId()).orElseThrow();
        assertThat(reread.getPaymentDataState()).isEqualTo(PaymentDataState.FETCHED_PRESENT);
        assertThat(workPaymentRepository.countByWorkId(work.getId())).isEqualTo(1);
    }
}
