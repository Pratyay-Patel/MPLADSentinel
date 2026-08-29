package com.mpladsentinel.mplads.ingestion;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.IngestionTrigger;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.repository.IngestionRunRepository;

/**
 * Owns the {@code ingestion_run} row lifecycle. Every method runs in its own
 * {@code REQUIRES_NEW} transaction so run bookkeeping is committed independently
 * of the works-page / payment-snapshot transactions &mdash; partial progress
 * survives a later failure (Q11).
 */
@Service
public class IngestionRunTracker {

    /** Incremental per-page counts accumulated onto the run. */
    public record PageCounts(int seen, int inserted, int updated, int unchanged, int deadLettered) {
        static PageCounts zero() {
            return new PageCounts(0, 0, 0, 0, 0);
        }

        PageCounts plus(PageCounts o) {
            return new PageCounts(seen + o.seen, inserted + o.inserted, updated + o.updated,
                    unchanged + o.unchanged, deadLettered + o.deadLettered);
        }
    }

    private final IngestionRunRepository runs;
    private final String apiBaseUrl;

    IngestionRunTracker(IngestionRunRepository runs,
                        com.mpladsentinel.mplads.source.empoweredindian.EmpoweredIndianClientProperties eiProps) {
        this.runs = runs;
        this.apiBaseUrl = eiProps.baseUrl();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public IngestionRun start(IngestionEndpoint endpoint, IngestionTrigger trigger,
                             Integer pageSize, Integer firstPage) {
        IngestionRun run = new IngestionRun(SourceName.EMPOWERED_INDIAN, endpoint, apiBaseUrl,
                trigger, IngestionRunStatus.RUNNING);
        if (pageSize != null) {
            run.setPageSize(pageSize.shortValue());
        }
        run.setFirstPage(firstPage);
        return runs.save(run);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordWorksPage(long runId, int lastPageCompleted, PageCounts counts) {
        IngestionRun run = require(runId);
        run.setPagesFetched(run.getPagesFetched() + 1);
        run.setLastPageCompleted(lastPageCompleted);
        run.setRecordsSeen(run.getRecordsSeen() + counts.seen());
        run.setRecordsInserted(run.getRecordsInserted() + counts.inserted());
        run.setRecordsUpdated(run.getRecordsUpdated() + counts.updated());
        run.setRecordsUnchanged(run.getRecordsUnchanged() + counts.unchanged());
        run.setRecordsDeadLettered(run.getRecordsDeadLettered() + counts.deadLettered());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordHttpError(long runId, String detail) {
        IngestionRun run = require(runId);
        run.setHttpErrorCount(run.getHttpErrorCount() + 1);
        appendNote(run, detail);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordDeadLetterCapReached(long runId, int cap, int suppressed) {
        IngestionRun run = require(runId);
        appendNote(run, "dead-letter cap " + cap + " reached; " + suppressed
                + " further un-normalisable record(s) were counted but not written");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void finish(long runId, IngestionRunStatus status, String errorSummary,
                       Long sourceReportedTotalCount) {
        IngestionRun run = require(runId);
        run.setStatus(status);
        run.setFinishedAt(Instant.now());
        if (errorSummary != null && !errorSummary.isBlank()) {
            run.setErrorSummary(truncate(errorSummary, 8_000));
        }
        if (sourceReportedTotalCount != null
                && sourceReportedTotalCount >= 0
                && sourceReportedTotalCount <= Integer.MAX_VALUE) {
            run.setSourceReportedTotalCount(sourceReportedTotalCount.intValue());
        }
    }

    private IngestionRun require(long runId) {
        return runs.findById(runId).orElseThrow(
                () -> new IllegalStateException("ingestion_run " + runId + " vanished mid-run"));
    }

    private static void appendNote(IngestionRun run, String line) {
        String existing = run.getNotes();
        run.setNotes(existing == null || existing.isBlank() ? line : existing + "\n" + line);
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}
