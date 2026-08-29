package com.mpladsentinel.mplads.ingestion;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;

class CompletedWorksIngestionIT extends AbstractIngestionIntegrationTest {

    @Autowired
    private WorkRepository workRepository;

    @Test
    void mapsCompletedEndpointFieldsAndLifecycle() {
        enqueue(ok(IngestionJson.completedPage(1, 1, 2, false,
                IngestionJson.completedWork(134703, "Completed A", "499993"),
                IngestionJson.completedWork(135593, "Completed B", "545766.98"))));

        WorksIngestionOutcome outcome = ingestionService.ingestCompletedWorks();

        assertThat(outcome.status()).isEqualTo(IngestionRunStatus.SUCCEEDED);
        assertThat(outcome.recordsInserted()).isEqualTo(2);

        Work a = workRepository.findBySourceNameAndSourceWorkId(SourceName.EMPOWERED_INDIAN, 134703L).orElseThrow();
        // work_id -> source_work_id ; cost -> finalCost (NOT estimatedCost)
        assertThat(a.getFinalCost()).isEqualByComparingTo("499993.00");
        assertThat(a.getEstimatedCost()).isNull();
        assertThat(a.getCompletedOn()).isEqualTo(LocalDate.of(2025, 1, 31));
        assertThat(a.getCompletionYear()).isEqualTo((short) 2025);
        assertThat(a.getHouse()).isNull();
        assertThat(a.isSeenInCompleted()).isTrue();
        assertThat(a.isSeenInRecommended()).isFalse();
        assertThat(a.getLifecycleState()).isEqualTo(LifecycleState.COMPLETED);

        Work b = workRepository.findBySourceNameAndSourceWorkId(SourceName.EMPOWERED_INDIAN, 135593L).orElseThrow();
        assertThat(b.getFinalCost()).isEqualByComparingTo("545766.98");

        assertThat(count("select count(*) from raw_source_record where endpoint = 'WORKS_COMPLETED'"))
                .isEqualTo(2);
    }

    @Test
    void reRunningTheSameCompletedDataChangesNothing() {
        String page = IngestionJson.completedPage(1, 1, 1, false,
                IngestionJson.completedWork(140001, "Stable", "1000"));
        enqueue(ok(page));
        ingestionService.ingestCompletedWorks();

        enqueue(ok(page));
        WorksIngestionOutcome second = ingestionService.ingestCompletedWorks();

        assertThat(second.recordsUnchanged()).isEqualTo(1);
        assertThat(second.recordsInserted()).isZero();
        assertThat(second.recordsUpdated()).isZero();
        assertThat(workRepository.count()).isEqualTo(1);
    }
}
