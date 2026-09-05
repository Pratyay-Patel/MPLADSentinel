package com.mpladsentinel.mplads.ingestion;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.mpladsentinel.mplads.repository.WorkRepository;

import okhttp3.mockwebserver.RecordedRequest;

/**
 * Integration coverage for the per-state "sample" ingestion
 * ({@link IngestionService#ingestRecommendedWorksForStates}): one run per state,
 * the {@code state} filter reaches the request, and the per-state page cap is
 * honoured. Named {@code …Test} (not {@code …IT}) so Surefire runs it in the
 * standard suite.
 */
class IngestionSampleByStateTest extends AbstractIngestionIntegrationTest {

    @Autowired
    private WorkRepository workRepository;

    /** The shared MockWebServer's recorded-request queue is not cleared by the base reset. */
    @BeforeEach
    void drainStaleRecordedRequests() throws InterruptedException {
        while (MOCK.takeRequest(1, TimeUnit.MILLISECONDS) != null) {
            // discard requests left over from a previous test method
        }
    }

    @Test
    void ingestsWorksFromEachRequestedStateAndOpensARunPerState() throws InterruptedException {
        enqueue(ok(IngestionJson.recommendedPage(1, 1, 2, false,
                IngestionJson.recommendedWork(501, "Kerala road", 100),
                IngestionJson.recommendedWork(502, "Kerala bridge", 200))));
        enqueue(ok(IngestionJson.recommendedPage(1, 1, 1, false,
                IngestionJson.recommendedWork(601, "Bihar canal", 300))));

        List<WorksIngestionOutcome> outcomes =
                ingestionService.ingestRecommendedWorksForStates(List.of("Kerala", "Bihar"), 1);

        assertThat(outcomes).hasSize(2);
        assertThat(outcomes.get(0).recordsInserted()).isEqualTo(2);
        assertThat(outcomes.get(1).recordsInserted()).isEqualTo(1);
        assertThat(workRepository.count()).isEqualTo(3);
        assertThat(count("select count(*) from ingestion_run where endpoint = 'WORKS_RECOMMENDED'"))
                .isEqualTo(2);

        RecordedRequest first = MOCK.takeRequest();
        RecordedRequest second = MOCK.takeRequest();
        assertThat(List.of(
                first.getRequestUrl().queryParameter("state"),
                second.getRequestUrl().queryParameter("state")))
                .containsExactly("Kerala", "Bihar");
    }

    @Test
    void perStatePageCapStopsPagingEvenWhenHasNextStaysTrue() {
        enqueue(ok(IngestionJson.recommendedPage(1, 9, 999, true,
                IngestionJson.recommendedWork(701, "Kerala p1", 100))));

        List<WorksIngestionOutcome> outcomes =
                ingestionService.ingestRecommendedWorksForStates(List.of("Kerala"), 1);

        assertThat(outcomes.get(0).pagesFetched()).isEqualTo(1);
        assertThat(workRepository.count()).isEqualTo(1);
    }

    @Test
    void skipsBlankAndDuplicateStateNames() {
        enqueue(ok(IngestionJson.recommendedPage(1, 1, 1, false,
                IngestionJson.recommendedWork(801, "Only", 100))));

        List<WorksIngestionOutcome> outcomes = ingestionService.ingestRecommendedWorksForStates(
                Arrays.asList("Kerala", "  ", null, "Kerala"), 1);

        assertThat(outcomes).hasSize(1);
        assertThat(workRepository.count()).isEqualTo(1);
    }
}
