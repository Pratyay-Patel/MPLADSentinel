package com.mpladsentinel.mplads.ingestion;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkPaymentRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;

class WorkPaymentsIngestionIT extends AbstractIngestionIntegrationTest {

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
    void fetchesAndStoresThePresentPaymentSnapshot() {
        Work work = seedWork(187484);
        enqueue(ok(IngestionJson.paymentsPresent(187484, List.of(new long[] {100, 5}, new long[] {200, 6}))));

        PaymentsIngestionOutcome outcome = ingestionService.ingestWorkPayments();

        assertThat(outcome.status()).isEqualTo(IngestionRunStatus.SUCCEEDED);
        assertThat(outcome.worksProcessed()).isEqualTo(1);
        assertThat(outcome.present()).isEqualTo(1);
        assertThat(outcome.paymentRowsWritten()).isEqualTo(2);

        assertThat(workPaymentRepository.countByWorkId(work.getId())).isEqualTo(2);
        Work reread = workRepository.findById(work.getId()).orElseThrow();
        assertThat(reread.getPaymentDataState()).isEqualTo(PaymentDataState.FETCHED_PRESENT);
        assertThat(reread.getPaymentTotalPaid()).isEqualByComparingTo("300.00");
        assertThat(reread.getPaymentInstallments()).isEqualTo(2);
        assertThat(reread.getPaymentSchemeDescription())
                .isEqualTo("Construction of community centers and community halls");
        assertThat(count("select count(*) from raw_source_record where endpoint = 'WORK_PAYMENTS' "
                + "and source_work_id = 187484 and http_status = 200")).isEqualTo(1);
    }

    @Test
    void a404NoPaymentRecordsBecomesFetchedAbsentNotZero() {
        Work work = seedWork(1845);
        enqueue(json(404, IngestionJson.PAYMENTS_404_NO_RECORDS));

        PaymentsIngestionOutcome outcome = ingestionService.ingestWorkPayments();

        assertThat(outcome.status()).isEqualTo(IngestionRunStatus.SUCCEEDED);
        assertThat(outcome.absent()).isEqualTo(1);

        Work reread = workRepository.findById(work.getId()).orElseThrow();
        assertThat(reread.getPaymentDataState()).isEqualTo(PaymentDataState.FETCHED_ABSENT);
        assertThat(reread.getPaymentTotalPaid()).isNull(); // unknown, NOT zero
        assertThat(workPaymentRepository.countByWorkId(work.getId())).isZero();
        assertThat(count("select count(*) from raw_source_record where endpoint = 'WORK_PAYMENTS' "
                + "and source_work_id = 1845 and http_status = 404")).isEqualTo(1);
    }

    @Test
    void aMalformedPaymentBodyIsDeadLetteredAndLeavesFetchError() {
        Work work = seedWork(900900);
        enqueue(ok(IngestionJson.PAYMENTS_MALFORMED_200));

        PaymentsIngestionOutcome outcome = ingestionService.ingestWorkPayments();

        assertThat(outcome.status()).isEqualTo(IngestionRunStatus.PARTIAL);
        assertThat(outcome.deadLettered()).isEqualTo(1);
        assertThat(count("select count(*) from ingestion_dead_letter "
                + "where error_type = 'PAYMENT_RESPONSE_MALFORMED' and source_work_id = 900900")).isEqualTo(1);
        assertThat(workRepository.findById(work.getId()).orElseThrow().getPaymentDataState())
                .isEqualTo(PaymentDataState.FETCH_ERROR);
    }

    @Test
    void aFetchErrorWithNoPriorSnapshotBecomesFetchError() {
        Work work = seedWork(700700);
        enqueue(json(500, "{\"error\":\"server\"}"));

        PaymentsIngestionOutcome outcome = ingestionService.ingestWorkPayments();

        assertThat(outcome.status()).isEqualTo(IngestionRunStatus.PARTIAL);
        assertThat(outcome.fetchError()).isEqualTo(1);
        assertThat(workRepository.findById(work.getId()).orElseThrow().getPaymentDataState())
                .isEqualTo(PaymentDataState.FETCH_ERROR);
        assertThat(count("select http_error_count from ingestion_run where id = ?", outcome.runId()))
                .isGreaterThanOrEqualTo(1);
    }
}
