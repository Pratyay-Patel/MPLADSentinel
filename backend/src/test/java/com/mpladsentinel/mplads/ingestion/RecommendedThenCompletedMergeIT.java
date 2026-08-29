package com.mpladsentinel.mplads.ingestion;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;

/**
 * The same {@code source_work_id} seen in both endpoints collapses to one unified
 * {@link Work} (confirmed decision 5): both {@code seen_in_*} true,
 * {@code lifecycleState = RECOMMENDED_AND_COMPLETED}, and the two financial
 * concepts kept distinct &mdash; {@code estimated_cost} in {@code estimatedCost},
 * {@code cost} in {@code finalCost}, neither overwriting the other.
 */
class RecommendedThenCompletedMergeIT extends AbstractIngestionIntegrationTest {

    @Autowired
    private WorkRepository workRepository;

    @Test
    void recommendedThenCompletedForOneIdBecomesOneUnifiedWork() {
        enqueue(ok(IngestionJson.recommendedPage(1, 1, 1, false,
                IngestionJson.recommendedWork(555001, "Bridge works", 2_500_000))));
        ingestionService.ingestRecommendedWorks();

        enqueue(ok(IngestionJson.completedPage(1, 1, 1, false,
                IngestionJson.completedWork(555001, "Bridge works completed", "2000000"))));
        WorksIngestionOutcome completed = ingestionService.ingestCompletedWorks();

        assertThat(completed.recordsUpdated()).isEqualTo(1);
        assertThat(workRepository.count()).isEqualTo(1);

        Work w = workRepository.findBySourceNameAndSourceWorkId(SourceName.EMPOWERED_INDIAN, 555001L).orElseThrow();
        assertThat(w.isSeenInRecommended()).isTrue();
        assertThat(w.isSeenInCompleted()).isTrue();
        assertThat(w.getLifecycleState()).isEqualTo(LifecycleState.RECOMMENDED_AND_COMPLETED);
        assertThat(w.getEstimatedCost()).isEqualByComparingTo("2500000.00"); // from /recommended, preserved
        assertThat(w.getFinalCost()).isEqualByComparingTo("2000000.00");     // from /completed
        assertThat(w.getHouse()).isNotNull();          // recommended-only field kept through the completed merge
        assertThat(w.getRecommendedYear()).isEqualTo((short) 2026);
        assertThat(w.getCompletionYear()).isEqualTo((short) 2025);

        assertThat(count("select count(*) from raw_source_record where source_work_id = 555001")).isEqualTo(2);
    }

    @Test
    void completedThenRecommendedProducesTheSameUnifiedResult() {
        enqueue(ok(IngestionJson.completedPage(1, 1, 1, false,
                IngestionJson.completedWork(555002, "Completed first", "900000"))));
        ingestionService.ingestCompletedWorks();

        enqueue(ok(IngestionJson.recommendedPage(1, 1, 1, false,
                IngestionJson.recommendedWork(555002, "Recommended second", 950_000))));
        ingestionService.ingestRecommendedWorks();

        Work w = workRepository.findBySourceNameAndSourceWorkId(SourceName.EMPOWERED_INDIAN, 555002L).orElseThrow();
        assertThat(w.getLifecycleState()).isEqualTo(LifecycleState.RECOMMENDED_AND_COMPLETED);
        assertThat(w.getEstimatedCost()).isEqualByComparingTo("950000.00");
        assertThat(w.getFinalCost()).isEqualByComparingTo("900000.00");
        assertThat(workRepository.count()).isEqualTo(1);
    }
}
