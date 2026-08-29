package com.mpladsentinel.mplads.ingestion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;

class RecommendedWorksIngestionIT extends AbstractIngestionIntegrationTest {

    @Autowired
    private WorkRepository workRepository;

    @Test
    void ingestsASinglePageAndStopsOnHasNextFalse() {
        enqueue(ok(IngestionJson.recommendedPage(1, 1, 2, false,
                IngestionJson.recommendedWork(101, "Road A", 2_500_000),
                IngestionJson.recommendedWork(102, "Road B", 500_000))));

        WorksIngestionOutcome outcome = ingestionService.ingestRecommendedWorks();

        assertThat(outcome.endpoint()).isEqualTo(IngestionEndpoint.WORKS_RECOMMENDED);
        assertThat(outcome.status()).isEqualTo(IngestionRunStatus.SUCCEEDED);
        assertThat(outcome.pagesFetched()).isEqualTo(1);
        assertThat(outcome.recordsInserted()).isEqualTo(2);
        assertThat(outcome.recordsSeen()).isEqualTo(2);

        Work a = workRepository.findBySourceNameAndSourceWorkId(SourceName.EMPOWERED_INDIAN, 101L).orElseThrow();
        assertThat(a.getWorkDescription()).isEqualTo("Road A");
        assertThat(a.getEstimatedCost()).isEqualByComparingTo("2500000.00");
        assertThat(a.isSeenInRecommended()).isTrue();
        assertThat(a.isSeenInCompleted()).isFalse();
        assertThat(a.getLifecycleState()).isEqualTo(LifecycleState.RECOMMENDED);
        assertThat(a.getLastIngestionRun().getId()).isEqualTo(outcome.runId());

        assertThat(count("select count(*) from raw_source_record where endpoint = 'WORKS_RECOMMENDED'"))
                .isEqualTo(2);
        assertThat(count("select count(*) from ingestion_run where id = ? and status = 'SUCCEEDED'",
                outcome.runId())).isEqualTo(1);
    }

    @Test
    void followsPaginationUntilHasNextFalse() {
        enqueue(ok(IngestionJson.recommendedPage(1, 2, 3, true,
                IngestionJson.recommendedWork(201, "P1-A", 100),
                IngestionJson.recommendedWork(202, "P1-B", 100))));
        enqueue(ok(IngestionJson.recommendedPage(2, 2, 3, false,
                IngestionJson.recommendedWork(203, "P2-A", 100))));

        WorksIngestionOutcome outcome = ingestionService.ingestRecommendedWorks();

        assertThat(outcome.pagesFetched()).isEqualTo(2);
        assertThat(outcome.recordsInserted()).isEqualTo(3);
        assertThat(workRepository.count()).isEqualTo(3);
        assertThat(count("select last_page_completed from ingestion_run where id = ?", outcome.runId()))
                .isEqualTo(2);
    }

    @Test
    void stopsOnAnEmptyPage() {
        enqueue(ok(IngestionJson.recommendedPage(1, 9, 999, true,
                IngestionJson.recommendedWork(301, "Only", 100))));
        enqueue(ok(IngestionJson.recommendedPage(2, 9, 999, true))); // empty list, still hasNext=true

        WorksIngestionOutcome outcome = ingestionService.ingestRecommendedWorks();

        assertThat(outcome.status()).isEqualTo(IngestionRunStatus.SUCCEEDED);
        assertThat(outcome.pagesFetched()).isEqualTo(1);
        assertThat(workRepository.count()).isEqualTo(1);
    }

    @Test
    void reRunningTheSameDataChangesNothing() {
        String page = IngestionJson.recommendedPage(1, 1, 2, false,
                IngestionJson.recommendedWork(401, "Stable A", 100),
                IngestionJson.recommendedWork(402, "Stable B", 200));
        enqueue(ok(page));
        ingestionService.ingestRecommendedWorks();

        enqueue(ok(page));
        WorksIngestionOutcome second = ingestionService.ingestRecommendedWorks();

        assertThat(second.recordsInserted()).isZero();
        assertThat(second.recordsUpdated()).isZero();
        assertThat(second.recordsUnchanged()).isEqualTo(2);
        assertThat(workRepository.count()).isEqualTo(2);
        assertThat(count("select count(*) from raw_source_record")).isEqualTo(2);
    }

    @Test
    void routesAnUnnormalisableRecordToDeadLetterAndKeepsTheRest() {
        enqueue(ok(IngestionJson.recommendedPage(1, 1, 3, false,
                IngestionJson.recommendedWork(501, "Good A", 100),
                IngestionJson.recommendedNoId("no id here"),
                IngestionJson.recommendedWork(502, "Good B", 100))));

        WorksIngestionOutcome outcome = ingestionService.ingestRecommendedWorks();

        assertThat(outcome.status()).isEqualTo(IngestionRunStatus.SUCCEEDED); // partial-on-dead-letters=false
        assertThat(outcome.recordsInserted()).isEqualTo(2);
        assertThat(outcome.recordsDeadLettered()).isEqualTo(1);
        assertThat(outcome.deadLettersSuppressed()).isZero();
        assertThat(workRepository.count()).isEqualTo(2);
        assertThat(count("select count(*) from ingestion_dead_letter where error_type = 'MISSING_SOURCE_WORK_ID'"))
                .isEqualTo(1);
        assertThat(count("select count(*) from raw_source_record")).isEqualTo(2); // none for the id-less record
    }

    @Test
    void anHttpErrorMidPaginationLeavesEarlierPagesCommittedAndMarksPartial() {
        enqueue(ok(IngestionJson.recommendedPage(1, 5, 50, true,
                IngestionJson.recommendedWork(601, "Committed", 100))));
        enqueue(json(500, "{\"error\":\"boom\"}"));

        WorksIngestionOutcome outcome = ingestionService.ingestRecommendedWorks();

        assertThat(outcome.status()).isEqualTo(IngestionRunStatus.PARTIAL);
        assertThat(outcome.httpErrorCount()).isGreaterThanOrEqualTo(1);
        assertThat(outcome.recordsInserted()).isEqualTo(1);
        assertThat(workRepository.count()).isEqualTo(1);
        assertThat(count("select last_page_completed from ingestion_run where id = ?", outcome.runId()))
                .isEqualTo(1);
        assertThat(count("select http_error_count from ingestion_run where id = ?", outcome.runId()))
                .isGreaterThanOrEqualTo(1);
    }
}
