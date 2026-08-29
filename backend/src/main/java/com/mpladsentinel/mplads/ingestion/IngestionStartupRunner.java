package com.mpladsentinel.mplads.ingestion;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Dev / demo convenience: runs one or more ingestion steps once at application
 * startup, driven by {@code mplads.ingestion.run-on-startup}. Empty (the
 * default) does nothing, so this is inert in tests and any environment that
 * does not opt in.
 *
 * <p>This is deliberately the <em>only</em> non-test entry point into the
 * ingestion pipeline — there is still no HTTP endpoint or scheduler (see
 * {@code package-info}). A failing step is logged and the next step still runs;
 * ingestion writes are idempotent, so a re-run is always safe.
 */
@Component
class IngestionStartupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(IngestionStartupRunner.class);

    private static final String RECOMMENDED = "recommended";
    private static final String COMPLETED = "completed";
    private static final String PAYMENTS = "payments";
    private static final String SAMPLE = "sample";

    private final IngestionProperties properties;
    private final IngestionService ingestionService;

    IngestionStartupRunner(IngestionProperties properties, IngestionService ingestionService) {
        this.properties = properties;
        this.ingestionService = ingestionService;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> steps = properties.runOnStartup().stream()
                .flatMap(value -> Arrays.stream(value.split(",")))
                .map(step -> step.trim().toLowerCase(Locale.ROOT))
                .filter(step -> !step.isEmpty())
                .toList();

        if (steps.isEmpty()) {
            return;
        }

        log.info("Startup ingestion requested (mplads.ingestion.run-on-startup): {}", steps);
        for (String step : steps) {
            try {
                switch (step) {
                    case RECOMMENDED ->
                            log.info("Startup ingestion 'recommended' finished: {}",
                                    ingestionService.ingestRecommendedWorks());
                    case COMPLETED ->
                            log.info("Startup ingestion 'completed' finished: {}",
                                    ingestionService.ingestCompletedWorks());
                    case PAYMENTS ->
                            log.info("Startup ingestion 'payments' finished: {}",
                                    ingestionService.ingestWorkPayments());
                    case SAMPLE -> runSample();
                    default ->
                            log.warn("Ignoring unknown startup ingestion step '{}' "
                                    + "(expected: recommended, completed, payments, sample)", step);
                }
            } catch (RuntimeException ex) {
                log.error("Startup ingestion step '{}' failed; continuing with the rest", step, ex);
            }
        }
    }

    private void runSample() {
        List<String> states = properties.sampleStates();
        int pages = properties.samplePagesPerState();
        log.info("Startup ingestion 'sample': {} state(s), {} page(s) each per endpoint", states.size(), pages);
        int rec = ingestionService.ingestRecommendedWorksForStates(states, pages).stream()
                .mapToInt(WorksIngestionOutcome::recordsInserted).sum();
        int com = ingestionService.ingestCompletedWorksForStates(states, pages).stream()
                .mapToInt(WorksIngestionOutcome::recordsInserted).sum();
        log.info("Startup ingestion 'sample' finished: inserted {} recommended + {} completed work(s)", rec, com);
    }
}
