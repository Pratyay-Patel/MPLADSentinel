package com.mpladsentinel.mplads.ingestion;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.IntFunction;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.IngestionTrigger;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.ingestion.IngestionRunTracker.PageCounts;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.mplads.source.empoweredindian.ApiPageRequest;
import com.mpladsentinel.mplads.source.empoweredindian.EmpoweredIndianClient;
import com.mpladsentinel.mplads.source.empoweredindian.dto.CompletedWorksResponse;
import com.mpladsentinel.mplads.source.empoweredindian.dto.PageMetadata;
import com.mpladsentinel.mplads.source.empoweredindian.dto.RecommendedWorksResponse;
import com.mpladsentinel.mplads.source.empoweredindian.dto.WorkPaymentsResponse;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianClientException;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianResponseException;

/**
 * The single, manually-triggered entry point for MPLADS ingestion (Q9). Three
 * guarded operations, each running its own {@link com.mpladsentinel.mplads.domain.IngestionRun}:
 * <ul>
 *   <li>{@link #ingestRecommendedWorks()} &mdash; paginate {@code /works/recommended}</li>
 *   <li>{@link #ingestCompletedWorks()} &mdash; paginate {@code /works/completed}</li>
 *   <li>{@link #ingestWorkPayments()} &mdash; fetch payments for a bounded batch of works</li>
 * </ul>
 *
 * <p>No {@code @Scheduled}, no queue, no broker. HTTP calls happen here, outside
 * any transaction; every database mutation is delegated to a transactional
 * collaborator ({@link WorkPageProcessor}, {@link PaymentSnapshotWriter},
 * {@link IngestionRunTracker}) so a failure never corrupts already-committed work
 * (Q11). Re-running from the start is always safe &mdash; all writes are
 * idempotent on natural keys (Q3).
 */
@Service
public class IngestionService {

    private static final Logger log = LoggerFactory.getLogger(IngestionService.class);

    private final EmpoweredIndianClient client;
    private final IngestionProperties properties;
    private final IngestionRunTracker tracker;
    private final WorkPageProcessor pageProcessor;
    private final PaymentSnapshotWriter paymentWriter;
    private final PaymentCandidateQueries paymentCandidates;
    private final WorkRepository works;

    IngestionService(EmpoweredIndianClient client, IngestionProperties properties,
                     IngestionRunTracker tracker, WorkPageProcessor pageProcessor,
                     PaymentSnapshotWriter paymentWriter, PaymentCandidateQueries paymentCandidates,
                     WorkRepository works) {
        this.client = client;
        this.properties = properties;
        this.tracker = tracker;
        this.pageProcessor = pageProcessor;
        this.paymentWriter = paymentWriter;
        this.paymentCandidates = paymentCandidates;
        this.works = works;
    }

    // ================================================================
    // Works
    // ================================================================

    public WorksIngestionOutcome ingestRecommendedWorks() {
        int pageSize = properties.effectiveWorksPageSize();
        return runWorksLoop(IngestionEndpoint.WORKS_RECOMMENDED, pageSize,
                page -> fetchRecommendedPage(page, pageSize, null));
    }

    public WorksIngestionOutcome ingestCompletedWorks() {
        int pageSize = properties.effectiveWorksPageSize();
        return runWorksLoop(IngestionEndpoint.WORKS_COMPLETED, pageSize,
                page -> fetchCompletedPage(page, pageSize, null));
    }

    /**
     * Dev/demo helper: ingest a shallow, geographically diverse slice — the first
     * {@code pagesPerState} pages of {@code /works/recommended} for each named
     * {@code state}. Sequential paging of the full endpoint is state-alphabetical,
     * so a small run only ever reaches the first few states; this covers many.
     *
     * <p>One {@link com.mpladsentinel.mplads.domain.IngestionRun} per state. A
     * state that returns zero records is logged (usually a name/casing mismatch —
     * the filter is case-sensitive).
     */
    public List<WorksIngestionOutcome> ingestRecommendedWorksForStates(List<String> states,
                                                                       int pagesPerState) {
        int pageSize = properties.effectiveWorksPageSize();
        return runForStates(IngestionEndpoint.WORKS_RECOMMENDED, states, pagesPerState,
                (page, state) -> fetchRecommendedPage(page, pageSize, state));
    }

    /** As {@link #ingestRecommendedWorksForStates}, for {@code /works/completed}. */
    public List<WorksIngestionOutcome> ingestCompletedWorksForStates(List<String> states,
                                                                     int pagesPerState) {
        int pageSize = properties.effectiveWorksPageSize();
        return runForStates(IngestionEndpoint.WORKS_COMPLETED, states, pagesPerState,
                (page, state) -> fetchCompletedPage(page, pageSize, state));
    }

    private PageBatch fetchRecommendedPage(int page, int pageSize, String state) {
        RecommendedWorksResponse response =
                client.fetchRecommendedWorks(ApiPageRequest.of(page, pageSize, state));
        return new PageBatch(response.recommendedWorks().size(), response.pagination(),
                (runId, budget) -> pageProcessor.applyRecommendedPage(
                        runId, response.recommendedWorks(), response.lastUpdated(), budget));
    }

    private PageBatch fetchCompletedPage(int page, int pageSize, String state) {
        CompletedWorksResponse response =
                client.fetchCompletedWorks(ApiPageRequest.of(page, pageSize, state));
        return new PageBatch(response.completedWorks().size(), response.pagination(),
                (runId, budget) -> pageProcessor.applyCompletedPage(
                        runId, response.completedWorks(), response.lastUpdated(), budget));
    }

    private List<WorksIngestionOutcome> runForStates(
            IngestionEndpoint endpoint, List<String> states, int pagesPerState,
            BiFunction<Integer, String, PageBatch> pageFetch) {
        int cap = Math.max(1, pagesPerState);
        int pageSize = properties.effectiveWorksPageSize();
        List<WorksIngestionOutcome> outcomes = new ArrayList<>();
        for (String state : sanitizeStates(states)) {
            WorksIngestionOutcome outcome = runWorksLoop(endpoint, pageSize, cap,
                    page -> pageFetch.apply(page, state));
            if (outcome.recordsSeen() == 0) {
                log.warn("sample ingestion for {} state '{}' returned 0 records "
                        + "— check the state name/casing (the filter is case-sensitive)",
                        endpoint, state);
            }
            outcomes.add(outcome);
        }
        return outcomes;
    }

    /** Trim, drop blanks, de-duplicate, preserve order. */
    private static List<String> sanitizeStates(List<String> states) {
        if (states == null) {
            return List.of();
        }
        Set<String> seen = new LinkedHashSet<>();
        for (String raw : states) {
            if (raw == null) {
                continue;
            }
            String trimmed = raw.trim();
            if (!trimmed.isEmpty()) {
                seen.add(trimmed);
            }
        }
        return List.copyOf(seen);
    }

    private WorksIngestionOutcome runWorksLoop(IngestionEndpoint endpoint, int pageSize,
                                               IntFunction<PageBatch> fetch) {
        return runWorksLoop(endpoint, pageSize, properties.worksMaxPages(), fetch);
    }

    private WorksIngestionOutcome runWorksLoop(IngestionEndpoint endpoint, int pageSize, int maxPages,
                                               IntFunction<PageBatch> fetch) {
        long runId = tracker.start(endpoint, IngestionTrigger.MANUAL, pageSize, 1).getId();
        log.info("ingestion run {} started for {} (pageSize={})", runId, endpoint, pageSize);

        IngestionRunStatus status = IngestionRunStatus.SUCCEEDED;
        String errorSummary = null;
        Long lastTotalCount = null;
        PageCounts totals = PageCounts.zero();
        int deadLetterBudget = properties.deadLetterCapPerRun();
        int suppressed = 0;
        int httpErrors = 0;
        int pagesFetched = 0;
        boolean committedAny = false;

        int page = 1;
        while (page <= maxPages) {
            PageBatch batch;
            try {
                batch = fetch.apply(page);
            } catch (EmpoweredIndianClientException e) {
                httpErrors++;
                tracker.recordHttpError(runId, "fetch page " + page + " failed: " + e.getMessage());
                status = committedAny ? IngestionRunStatus.PARTIAL : IngestionRunStatus.FAILED;
                errorSummary = e.getMessage();
                break;
            }

            if (batch.pagination() != null && batch.pagination().totalCount() != null) {
                lastTotalCount = batch.pagination().totalCount();
            }
            if (batch.size() == 0) {
                break; // empty-page guard: treat as a clean end of data
            }

            WorkPageProcessor.PageResult result;
            try {
                result = batch.apply().apply(runId, deadLetterBudget);
            } catch (RuntimeException e) {
                // The page transaction has already rolled back; committed pages stand.
                log.error("ingestion run {} page {} failed to apply", runId, page, e);
                httpErrors++;
                tracker.recordHttpError(runId, "apply page " + page + " failed: " + e);
                status = committedAny ? IngestionRunStatus.PARTIAL : IngestionRunStatus.FAILED;
                errorSummary = String.valueOf(e);
                break;
            }

            committedAny = true;
            pagesFetched++;
            totals = totals.plus(result.counts());
            deadLetterBudget -= result.deadLettersWritten();
            suppressed += result.deadLettersSuppressed();
            tracker.recordWorksPage(runId, page, result.counts());

            if (result.deadLettersSuppressed() > 0
                    || (result.counts().deadLettered() > 0 && properties.partialOnDeadLetters())) {
                status = downgrade(status);
            }

            boolean hasNext = batch.pagination() != null && Boolean.TRUE.equals(batch.pagination().hasNext());
            if (!hasNext) {
                break;
            }
            page++;
            if (!sleep(properties.worksInterPageDelay())) {
                status = downgrade(status);
                errorSummary = appendReason(errorSummary, "interrupted before page " + page);
                break;
            }
        }
        if (page > maxPages) {
            status = downgrade(status);
            errorSummary = appendReason(errorSummary, "worksMaxPages ceiling (" + maxPages + ") reached");
        }

        if (suppressed > 0) {
            tracker.recordDeadLetterCapReached(runId, properties.deadLetterCapPerRun(), suppressed);
        }
        tracker.finish(runId, status, errorSummary, lastTotalCount);
        log.info("ingestion run {} finished {}: {}", runId, status, totals);

        return new WorksIngestionOutcome(runId, endpoint, status, pagesFetched,
                totals.seen(), totals.inserted(), totals.updated(), totals.unchanged(),
                totals.deadLettered(), suppressed, httpErrors, errorSummary);
    }

    // ================================================================
    // Payments
    // ================================================================

    public PaymentsIngestionOutcome ingestWorkPayments() {
        long runId = tracker.start(IngestionEndpoint.WORK_PAYMENTS, IngestionTrigger.MANUAL, null, null).getId();

        Instant now = Instant.now();
        Instant absentBefore = now.minus(properties.paymentsRecheckAbsentAfter());
        Instant presentBefore = now.minus(properties.paymentsRecheckPresentAfter());
        List<Long> ids = paymentCandidates.findCandidateWorkIds(
                SourceName.EMPOWERED_INDIAN, absentBefore, presentBefore,
                PageRequest.of(0, properties.paymentsMaxWorksPerRun()));
        List<Work> stubs = works.findAllById(ids);
        log.info("payment ingestion run {} selected {} work(s)", runId, stubs.size());

        int present = 0;
        int absent = 0;
        int fetchError = 0;
        int deadLettered = 0;
        int rowsWritten = 0;
        String errorSummary = null;
        IngestionRunStatus status = IngestionRunStatus.SUCCEEDED;

        for (Work stub : stubs) {
            long workDbId = stub.getId();
            long sourceWorkId = stub.getSourceWorkId();
            try {
                Optional<WorkPaymentsResponse> response = client.fetchWorkPayments(sourceWorkId);
                if (response.isPresent()) {
                    PaymentSnapshotWriter.Applied applied =
                            paymentWriter.applyPresent(runId, workDbId, sourceWorkId, response.get());
                    present++;
                    rowsWritten += applied.rowsWritten();
                } else {
                    paymentWriter.applyAbsent(runId, workDbId, sourceWorkId);
                    absent++;
                }
            } catch (EmpoweredIndianResponseException e) {
                paymentWriter.applyMalformed(runId, workDbId, sourceWorkId, e.getMessage());
                deadLettered++;
                status = downgrade(status);
            } catch (EmpoweredIndianClientException e) {
                paymentWriter.applyFetchError(runId, workDbId, sourceWorkId, e.getMessage());
                fetchError++;
                status = downgrade(status);
            } catch (RuntimeException e) {
                log.error("unexpected failure ingesting payments for work {} (source {})", workDbId, sourceWorkId, e);
                status = downgrade(status);
                errorSummary = String.valueOf(e);
            }
            if (!sleep(properties.paymentsInterRequestDelay())) {
                status = downgrade(status);
                errorSummary = appendReason(errorSummary, "interrupted");
                break;
            }
        }

        tracker.finish(runId, status, errorSummary, null);
        log.info("payment ingestion run {} finished {}: present={} absent={} fetchError={} deadLettered={} rows={}",
                runId, status, present, absent, fetchError, deadLettered, rowsWritten);
        return new PaymentsIngestionOutcome(runId, status, stubs.size(), present, absent, fetchError,
                deadLettered, rowsWritten, errorSummary);
    }

    // ================================================================
    // helpers
    // ================================================================

    private static IngestionRunStatus downgrade(IngestionRunStatus status) {
        return status == IngestionRunStatus.SUCCEEDED ? IngestionRunStatus.PARTIAL : status;
    }

    private static String appendReason(String existing, String reason) {
        return existing == null || existing.isBlank() ? reason : existing + "; " + reason;
    }

    private static boolean sleep(Duration delay) {
        if (delay == null || delay.isZero() || delay.isNegative()) {
            return true;
        }
        try {
            Thread.sleep(delay.toMillis());
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** One fetched page: its size, its pagination metadata, and how to apply it in a transaction. */
    private record PageBatch(int size, PageMetadata pagination, ApplyPage apply) {
    }

    @FunctionalInterface
    private interface ApplyPage {
        WorkPageProcessor.PageResult apply(long runId, int deadLetterBudget);
    }
}
