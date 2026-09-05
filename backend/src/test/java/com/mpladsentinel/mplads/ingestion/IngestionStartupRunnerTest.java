package com.mpladsentinel.mplads.ingestion;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;

/**
 * Unit tests for {@link IngestionStartupRunner} — no Spring context. Covers the
 * step parsing (comma-split, trim, case-insensitive), the off-by-default
 * behaviour, unknown tokens, and that one failing step does not stop the rest.
 */
class IngestionStartupRunnerTest {

    private final IngestionService ingestionService = mock(IngestionService.class);

    private IngestionStartupRunner runnerFor(String... runOnStartup) {
        return new IngestionStartupRunner(properties(List.of(runOnStartup)), ingestionService);
    }

    @Test
    void doesNothingWhenRunOnStartupIsEmpty() {
        runnerFor().run(new DefaultApplicationArguments());
        verifyNoInteractions(ingestionService);
    }

    @Test
    void runsTheRequestedStepsAndSkipsTheRest() {
        runnerFor("recommended", "payments").run(new DefaultApplicationArguments());

        verify(ingestionService).ingestRecommendedWorks();
        verify(ingestionService).ingestWorkPayments();
        verify(ingestionService, never()).ingestCompletedWorks();
    }

    @Test
    void parsesACommaSeparatedCaseInsensitiveList() {
        runnerFor(" Recommended , COMPLETED ").run(new DefaultApplicationArguments());

        verify(ingestionService).ingestRecommendedWorks();
        verify(ingestionService).ingestCompletedWorks();
        verify(ingestionService, never()).ingestWorkPayments();
    }

    @Test
    void ignoresUnknownTokensButStillRunsTheValidOnes() {
        runnerFor("bogus", "completed").run(new DefaultApplicationArguments());

        verify(ingestionService).ingestCompletedWorks();
        verify(ingestionService, never()).ingestRecommendedWorks();
    }

    @Test
    void oneFailingStepDoesNotStopTheRest() {
        when(ingestionService.ingestRecommendedWorks()).thenThrow(new RuntimeException("api down"));

        runnerFor("recommended", "completed").run(new DefaultApplicationArguments());

        verify(ingestionService).ingestRecommendedWorks();
        verify(ingestionService).ingestCompletedWorks();
    }

    @Test
    void sampleStepIngestsRecommendedAndCompletedPerConfiguredState() {
        when(ingestionService.ingestRecommendedWorksForStates(anyList(), anyInt())).thenReturn(List.of());
        when(ingestionService.ingestCompletedWorksForStates(anyList(), anyInt())).thenReturn(List.of());

        runnerFor("sample").run(new DefaultApplicationArguments());

        verify(ingestionService).ingestRecommendedWorksForStates(List.of("Kerala", "Bihar"), 2);
        verify(ingestionService).ingestCompletedWorksForStates(List.of("Kerala", "Bihar"), 2);
        verify(ingestionService, never()).ingestRecommendedWorks();
    }

    private static IngestionProperties properties(List<String> runOnStartup) {
        return new IngestionProperties(
                100, 6000, Duration.ZERO, 500, false, 200,
                Duration.ofMillis(200), Duration.ofDays(7), Duration.ofDays(30),
                runOnStartup, List.of("Kerala", "Bihar"), 2);
    }
}
