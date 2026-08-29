package com.mpladsentinel.mplads.ingestion;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpladsentinel.mplads.domain.IngestionDeadLetter;
import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.ingestion.IngestionRunTracker.PageCounts;
import com.mpladsentinel.mplads.normalization.NormalizationException;
import com.mpladsentinel.mplads.normalization.WorkNormalizer;
import com.mpladsentinel.mplads.repository.IngestionDeadLetterRepository;
import com.mpladsentinel.mplads.repository.IngestionRunRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.mplads.source.empoweredindian.dto.CompletedWorkDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.RecommendedWorkDto;

/**
 * Applies one page of works to the database in a single transaction (Q11). A
 * failure thrown out of {@link #applyRecommendedPage}/{@link #applyCompletedPage}
 * rolls back only that page; pages already committed are untouched.
 *
 * <p>Per record: upsert the raw payload, skip if the raw fingerprint is unchanged
 * and the work already exists (Q8), otherwise normalise and upsert/merge the
 * {@link Work}. An un-normalisable record becomes an {@code ingestion_dead_letter}
 * row (subject to the per-run cap, Q5) and the page continues.
 */
@Service
public class WorkPageProcessor {

    private static final Logger log = LoggerFactory.getLogger(WorkPageProcessor.class);

    /**
     * @param counts             seen / inserted / updated / unchanged / dead-lettered for this page
     * @param deadLettersWritten dead-letter rows actually created this page
     * @param deadLettersSuppressed un-normalisable records skipped because the run cap was hit (Q5)
     */
    public record PageResult(PageCounts counts, int deadLettersWritten, int deadLettersSuppressed) {
    }

    private final WorkRepository works;
    private final IngestionRunRepository runs;
    private final IngestionDeadLetterRepository deadLetters;
    private final RawSourceRecordService rawRecords;
    private final WorkNormalizer normalizer;
    private final WorkMerger merger;
    private final ObjectMapper objectMapper;

    WorkPageProcessor(WorkRepository works, IngestionRunRepository runs,
                      IngestionDeadLetterRepository deadLetters, RawSourceRecordService rawRecords,
                      WorkNormalizer normalizer, WorkMerger merger, ObjectMapper objectMapper) {
        this.works = works;
        this.runs = runs;
        this.deadLetters = deadLetters;
        this.rawRecords = rawRecords;
        this.normalizer = normalizer;
        this.merger = merger;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PageResult applyRecommendedPage(long runId, List<RecommendedWorkDto> page, Instant responseAt,
                                           int deadLetterBudget) {
        IngestionRun run = requireRun(runId);
        Accumulator acc = new Accumulator(deadLetterBudget);
        for (RecommendedWorkDto dto : page) {
            applyRecommended(dto, responseAt, run, acc);
        }
        return acc.toResult();
    }

    @Transactional
    public PageResult applyCompletedPage(long runId, List<CompletedWorkDto> page, Instant responseAt,
                                         int deadLetterBudget) {
        IngestionRun run = requireRun(runId);
        Accumulator acc = new Accumulator(deadLetterBudget);
        for (CompletedWorkDto dto : page) {
            applyCompleted(dto, responseAt, run, acc);
        }
        return acc.toResult();
    }

    // ------------------------------------------------------------------

    private void applyRecommended(RecommendedWorkDto dto, Instant responseAt, IngestionRun run, Accumulator acc) {
        Long sourceWorkId = dto.workId();
        if (sourceWorkId == null || sourceWorkId <= 0) {
            acc.deadLetter(run, IngestionEndpoint.WORKS_RECOMMENDED, dto, null,
                    "MISSING_SOURCE_WORK_ID", "recommended record has no usable workId", deadLetters);
            return;
        }
        RawSourceRecordService.RawUpsert raw = rawRecords.upsertWorkPayload(
                IngestionEndpoint.WORKS_RECOMMENDED, sourceWorkId, dto, responseAt, run);
        Optional<Work> existing = works.findBySourceNameAndSourceWorkId(
                SourceName.EMPOWERED_INDIAN, sourceWorkId);
        if (!raw.changed() && existing.isPresent()) {
            acc.unchanged();
            return;
        }
        Work fresh;
        try {
            fresh = normalizer.fromRecommended(dto, responseAt, run);
        } catch (NormalizationException e) {
            acc.deadLetter(run, IngestionEndpoint.WORKS_RECOMMENDED, dto, sourceWorkId,
                    classify(e), e.getMessage(), deadLetters);
            return;
        }
        WorkMerger.MergeResult result = merger.mergeRecommended(existing.orElse(null), fresh, run);
        persist(result, acc);
    }

    private void applyCompleted(CompletedWorkDto dto, Instant responseAt, IngestionRun run, Accumulator acc) {
        Long sourceWorkId = dto.workId();
        if (sourceWorkId == null || sourceWorkId <= 0) {
            acc.deadLetter(run, IngestionEndpoint.WORKS_COMPLETED, dto, null,
                    "MISSING_SOURCE_WORK_ID", "completed record has no usable work_id", deadLetters);
            return;
        }
        RawSourceRecordService.RawUpsert raw = rawRecords.upsertWorkPayload(
                IngestionEndpoint.WORKS_COMPLETED, sourceWorkId, dto, responseAt, run);
        Optional<Work> existing = works.findBySourceNameAndSourceWorkId(
                SourceName.EMPOWERED_INDIAN, sourceWorkId);
        if (!raw.changed() && existing.isPresent()) {
            acc.unchanged();
            return;
        }
        Work fresh;
        try {
            fresh = normalizer.fromCompleted(dto, responseAt, run);
        } catch (NormalizationException e) {
            acc.deadLetter(run, IngestionEndpoint.WORKS_COMPLETED, dto, sourceWorkId,
                    classify(e), e.getMessage(), deadLetters);
            return;
        }
        WorkMerger.MergeResult result = merger.mergeCompleted(existing.orElse(null), fresh, run);
        persist(result, acc);
    }

    private void persist(WorkMerger.MergeResult result, Accumulator acc) {
        if (result.inserted()) {
            works.save(result.work());
            acc.inserted();
        } else if (result.changed()) {
            acc.updated();
        } else {
            acc.unchanged();
        }
    }

    private IngestionRun requireRun(long runId) {
        return runs.findById(runId).orElseThrow(
                () -> new IllegalStateException("ingestion_run " + runId + " not found"));
    }

    private static String classify(NormalizationException e) {
        String msg = e.getMessage() == null ? "" : e.getMessage();
        return msg.contains("identifier") ? "MISSING_SOURCE_WORK_ID" : "NORMALIZATION_ERROR";
    }

    private String toJson(Object dto) {
        try {
            return objectMapper.writeValueAsString(dto);
        } catch (JsonProcessingException e) {
            return "{\"_error\":\"payload not serialisable\"}";
        }
    }

    /** Mutable per-page tally. */
    private final class Accumulator {
        private int seen;
        private int inserted;
        private int updated;
        private int unchanged;
        private int deadLettered;
        private int deadLettersSuppressed;
        private int budget;

        Accumulator(int budget) {
            this.budget = budget;
        }

        void inserted() {
            seen++;
            inserted++;
        }

        void updated() {
            seen++;
            updated++;
        }

        void unchanged() {
            seen++;
            unchanged++;
        }

        void deadLetter(IngestionRun run, IngestionEndpoint endpoint, Object dto, Long sourceWorkId,
                        String errorType, String detail, IngestionDeadLetterRepository repo) {
            if (budget <= 0) {
                deadLettersSuppressed++;
                log.warn("dead-letter cap hit on run {}: suppressing {} {}", run.getId(), endpoint, sourceWorkId);
                return;
            }
            IngestionDeadLetter dl = new IngestionDeadLetter(run, endpoint, toJson(dto), cap(errorType, 48));
            dl.setSourceWorkId(sourceWorkId);
            dl.setErrorDetail(detail);
            repo.save(dl);
            budget--;
            deadLettered++;
        }

        PageResult toResult() {
            return new PageResult(new PageCounts(seen, inserted, updated, unchanged, deadLettered),
                    deadLettered, deadLettersSuppressed);
        }

        private String cap(String value, int max) {
            return value.length() <= max ? value : value.substring(0, max);
        }
    }
}
