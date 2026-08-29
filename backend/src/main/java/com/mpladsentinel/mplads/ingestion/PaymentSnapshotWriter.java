package com.mpladsentinel.mplads.ingestion;

import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mpladsentinel.mplads.domain.IngestionDeadLetter;
import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.domain.WorkPayment;
import com.mpladsentinel.mplads.normalization.NormalizedPayments;
import com.mpladsentinel.mplads.normalization.PaymentNormalizer;
import com.mpladsentinel.mplads.repository.IngestionDeadLetterRepository;
import com.mpladsentinel.mplads.repository.IngestionRunRepository;
import com.mpladsentinel.mplads.repository.WorkPaymentRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.mplads.source.empoweredindian.dto.WorkPaymentsResponse;

/**
 * Replaces one work's payment snapshot in a single transaction (Q2, Q11).
 *
 * <ul>
 *   <li><strong>present</strong> (HTTP 200): normalise, delete the existing
 *       {@code work_payment} rows and insert the freshly fetched set, refresh the
 *       {@code work.payment_*} roll-ups, {@code payment_data_state = FETCHED_PRESENT}.
 *       Zero installments still counts as a successful snapshot (0 current rows),
 *       kept distinct from "no payment data".</li>
 *   <li><strong>absent</strong> (verified HTTP 404 "no payment records"):
 *       {@code payment_data_state = FETCHED_ABSENT}, current rows cleared,
 *       roll-ups null (unknown, never &#8377;0), 404 sentinel raw record.</li>
 *   <li><strong>fetch error</strong> / <strong>malformed</strong>: never downgrade
 *       an existing {@code FETCHED_PRESENT} snapshot (Q1) &mdash; only a work that
 *       has no successful snapshot moves to {@code FETCH_ERROR}. Malformed payloads
 *       are also dead-lettered.</li>
 * </ul>
 */
@Service
public class PaymentSnapshotWriter {

    /** What happened for one work, for the run tally. */
    public enum Result { PRESENT, ABSENT, FETCH_ERROR, DEAD_LETTERED }

    public record Applied(Result result, int rowsWritten) {
    }

    private final WorkRepository works;
    private final WorkPaymentRepository payments;
    private final IngestionRunRepository runs;
    private final IngestionDeadLetterRepository deadLetters;
    private final PaymentNormalizer normalizer;
    private final RawSourceRecordService rawRecords;

    PaymentSnapshotWriter(WorkRepository works, WorkPaymentRepository payments, IngestionRunRepository runs,
                          IngestionDeadLetterRepository deadLetters, PaymentNormalizer normalizer,
                          RawSourceRecordService rawRecords) {
        this.works = works;
        this.payments = payments;
        this.runs = runs;
        this.deadLetters = deadLetters;
        this.normalizer = normalizer;
        this.rawRecords = rawRecords;
    }

    @Transactional
    public Applied applyPresent(long runId, long workDbId, long sourceWorkId, WorkPaymentsResponse response) {
        Work work = requireWork(workDbId);
        IngestionRun run = requireRun(runId);
        Instant now = Instant.now();

        NormalizedPayments np = normalizer.present(response, work, run);

        List<WorkPayment> existing = payments.findByWorkIdOrderBySourceOrdinalAsc(workDbId);
        if (!existing.isEmpty()) {
            payments.deleteAllInBatch(existing);
        }
        if (!np.installments().isEmpty()) {
            payments.saveAll(np.installments());
        }

        work.setPaymentDataState(PaymentDataState.FETCHED_PRESENT);
        work.setPaymentTotalPaid(np.totalPaid());
        work.setPaymentInstallments(np.installmentCount());
        work.setPaymentSuccessfulCount(np.successfulCount());
        work.setPaymentPendingCount(np.pendingCount());
        work.setPaymentFirstOn(np.firstPaidOn());
        work.setPaymentLastOn(np.lastPaidOn());
        work.setPaymentSchemeDescription(np.schemeDescription());
        unionFlags(work, np.dataQualityFlags());
        stampProvenance(work, run, now);

        rawRecords.upsertPaymentsPayload(sourceWorkId, response, now, run);
        return new Applied(Result.PRESENT, np.installments().size());
    }

    @Transactional
    public Applied applyAbsent(long runId, long workDbId, long sourceWorkId) {
        Work work = requireWork(workDbId);
        IngestionRun run = requireRun(runId);
        Instant now = Instant.now();

        List<WorkPayment> existing = payments.findByWorkIdOrderBySourceOrdinalAsc(workDbId);
        if (!existing.isEmpty()) {
            payments.deleteAllInBatch(existing);
        }

        work.setPaymentDataState(PaymentDataState.FETCHED_ABSENT);
        clearRollups(work);
        stampProvenance(work, run, now);

        rawRecords.upsertPaymentsAbsentSentinel(sourceWorkId, now, run);
        return new Applied(Result.ABSENT, 0);
    }

    /** Non-2xx / transport failure after the client's own bounded retries. */
    @Transactional
    public Applied applyFetchError(long runId, long workDbId, long sourceWorkId, String detail) {
        Work work = requireWork(workDbId);
        IngestionRun run = requireRun(runId);
        // Q1: keep a previous successful snapshot; only a work that never succeeded moves to FETCH_ERROR.
        if (work.getPaymentDataState() != PaymentDataState.FETCHED_PRESENT) {
            work.setPaymentDataState(PaymentDataState.FETCH_ERROR);
        }
        run.setHttpErrorCount(run.getHttpErrorCount() + 1);
        appendNote(run, "payments fetch failed for workId " + sourceWorkId + ": " + detail);
        return new Applied(Result.FETCH_ERROR, 0);
    }

    /** 2xx body that does not match the verified contract: dead-letter it. */
    @Transactional
    public Applied applyMalformed(long runId, long workDbId, long sourceWorkId, String detail) {
        Work work = requireWork(workDbId);
        IngestionRun run = requireRun(runId);

        IngestionDeadLetter dl = new IngestionDeadLetter(run, IngestionEndpoint.WORK_PAYMENTS,
                "{\"_error\":\"malformed payments response\",\"workId\":" + sourceWorkId + "}",
                "PAYMENT_RESPONSE_MALFORMED");
        dl.setSourceWorkId(sourceWorkId);
        dl.setErrorDetail(detail);
        deadLetters.save(dl);

        if (work.getPaymentDataState() != PaymentDataState.FETCHED_PRESENT) {
            work.setPaymentDataState(PaymentDataState.FETCH_ERROR);
        }
        return new Applied(Result.DEAD_LETTERED, 0);
    }

    // ------------------------------------------------------------------

    private static void clearRollups(Work work) {
        work.setPaymentTotalPaid(null);
        work.setPaymentInstallments(null);
        work.setPaymentSuccessfulCount(null);
        work.setPaymentPendingCount(null);
        work.setPaymentFirstOn(null);
        work.setPaymentLastOn(null);
        work.setPaymentSchemeDescription(null);
    }

    private static void stampProvenance(Work work, IngestionRun run, Instant now) {
        work.setLastIngestedAt(now);
        work.setLastIngestionRun(run);
    }

    private static void unionFlags(Work work, List<String> add) {
        Set<String> merged = new LinkedHashSet<>(Arrays.asList(work.getDataQualityFlags()));
        merged.addAll(add);
        work.setDataQualityFlags(merged.toArray(String[]::new));
    }

    private static void appendNote(IngestionRun run, String line) {
        String existing = run.getNotes();
        run.setNotes(existing == null || existing.isBlank() ? line : existing + "\n" + line);
    }

    private Work requireWork(long id) {
        return works.findById(id).orElseThrow(
                () -> new IllegalStateException("work " + id + " not found"));
    }

    private IngestionRun requireRun(long id) {
        return runs.findById(id).orElseThrow(
                () -> new IllegalStateException("ingestion_run " + id + " not found"));
    }
}
