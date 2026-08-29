package com.mpladsentinel.mplads.ingestion;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.repository.WorkRepository;

/**
 * Bounded-work guarantees: the per-run dead-letter cap (Q5) and the per-run
 * payment work limit (Q4). Payment recheck windows stay at their defaults so a
 * processed work is not immediately re-selected.
 */
@TestPropertySource(properties = {
        "mplads.ingestion.dead-letter-cap-per-run=1",
        "mplads.ingestion.payments-max-works-per-run=2"
})
class IngestionCapAndBatchIT extends AbstractIngestionIntegrationTest {

    @Autowired
    private WorkRepository workRepository;

    @Test
    void deadLetterCapStopsWritingRowsAndRecordsTheConditionOnTheRun() {
        enqueue(ok(IngestionJson.recommendedPage(1, 1, 4, false,
                IngestionJson.recommendedWork(410001, "Good A", 100),
                IngestionJson.recommendedNoId("bad one"),
                IngestionJson.recommendedNoId("bad two"),
                IngestionJson.recommendedWork(410002, "Good B", 100))));

        WorksIngestionOutcome outcome = ingestionService.ingestRecommendedWorks();

        assertThat(outcome.recordsDeadLettered()).isEqualTo(1);   // cap = 1
        assertThat(outcome.deadLettersSuppressed()).isEqualTo(1); // the second bad record
        assertThat(outcome.status()).isEqualTo(IngestionRunStatus.PARTIAL);
        assertThat(outcome.recordsInserted()).isEqualTo(2);       // the good records still land
        assertThat(count("select count(*) from ingestion_dead_letter")).isEqualTo(1);
        String notes = jdbc.queryForObject(
                "select notes from ingestion_run where id = ?", String.class, outcome.runId());
        assertThat(notes).contains("dead-letter cap");
    }

    @Test
    void paymentRunProcessesAtMostTheConfiguredNumberOfWorksAndTheRestResumeNextRun() {
        for (long id : new long[] {420001, 420002, 420003}) {
            enqueue(ok(IngestionJson.recommendedPage(1, 1, 1, false,
                    IngestionJson.recommendedWork(id, "Seed " + id, 100))));
            ingestionService.ingestRecommendedWorks();
        }

        enqueue(ok(IngestionJson.paymentsPresent(420001, List.of(new long[] {10, 1}))));
        enqueue(ok(IngestionJson.paymentsPresent(420002, List.of(new long[] {20, 2}))));
        PaymentsIngestionOutcome first = ingestionService.ingestWorkPayments();

        assertThat(first.worksProcessed()).isEqualTo(2); // max-works-per-run = 2
        assertThat(first.present()).isEqualTo(2);
        assertThat(pendingPaymentWorks()).isEqualTo(1);

        enqueue(ok(IngestionJson.paymentsPresent(420003, List.of(new long[] {30, 3}))));
        PaymentsIngestionOutcome second = ingestionService.ingestWorkPayments();

        assertThat(second.worksProcessed()).isEqualTo(1); // the remaining work
        assertThat(second.present()).isEqualTo(1);
        assertThat(pendingPaymentWorks()).isZero();
    }

    private long pendingPaymentWorks() {
        return workRepository.findAll().stream()
                .filter(w -> SourceName.EMPOWERED_INDIAN.equals(w.getSourceName()))
                .filter(w -> w.getPaymentDataState() == PaymentDataState.NOT_FETCHED)
                .count();
    }
}
