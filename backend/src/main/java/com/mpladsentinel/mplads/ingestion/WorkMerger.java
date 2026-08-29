package com.mpladsentinel.mplads.ingestion;

import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.normalization.WorkNormalizer;

/**
 * Folds a freshly-normalised {@link Work} (produced by {@link WorkNormalizer} for
 * one endpoint) into the persistent record for the same {@code source_work_id}.
 *
 * <p>Rules (Phase 2E-2 confirmed decisions):
 * <ul>
 *   <li>Only the <strong>current endpoint's</strong> fields are overwritten. The
 *       recommended path never touches {@code finalCost} / {@code completedOn} /
 *       {@code completionYear}; the completed path never touches
 *       {@code estimatedCost} / {@code house} / {@code lsTerm} /
 *       {@code sourceStatusRaw} / the inline {@code rec*} payment signal
 *       (decision 5 &mdash; financial fields stay distinct, neither overwrites the
 *       other, absent values are never fabricated).</li>
 *   <li>{@code seenInRecommended} / {@code seenInCompleted} are OR-ed, never
 *       cleared; {@code lifecycleState} is recomputed with
 *       {@link WorkNormalizer#deriveLifecycle(boolean, boolean)}.
 *       {@code RECOMMENDED_AND_COMPLETED} records only that the id was seen in
 *       both datasets &mdash; not a proven lifecycle transition (&sect;13.6).</li>
 *   <li>{@code dataQualityFlags} use <strong>union</strong> semantics (Q7): flags
 *       from the other endpoint and from prior runs are retained; a flag is never
 *       dropped just because the latest response no longer triggers it.</li>
 * </ul>
 *
 * <p>Pure in-memory mapping &mdash; no repository, no HTTP. The caller persists.
 */
@Component
public class WorkMerger {

    /**
     * @param work    the entity to persist (the managed {@code existing} on update, or {@code fresh} on insert)
     * @param inserted {@code true} when this is a first insert
     * @param changed  {@code true} when an insert, or an update that actually altered a mapped field / flag
     */
    public record MergeResult(Work work, boolean inserted, boolean changed) {
    }

    /** Merge a recommended-endpoint observation. */
    public MergeResult mergeRecommended(Work existing, Work fresh, IngestionRun run) {
        if (existing == null) {
            return new MergeResult(fresh, true, true);
        }
        List<Object> before = snapshotRecommended(existing);

        existing.setWorkDescription(fresh.getWorkDescription());
        existing.setCategory(fresh.getCategory());
        existing.setCategoryNormalized(fresh.getCategoryNormalized());
        existing.setHouse(fresh.getHouse());
        existing.setLsTerm(fresh.getLsTerm());
        copyPeopleAndPlace(existing, fresh);
        existing.setEstimatedCost(fresh.getEstimatedCost());
        existing.setRecommendedOn(fresh.getRecommendedOn());
        existing.setRecommendedYear(fresh.getRecommendedYear());
        existing.setSourceStatusRaw(fresh.getSourceStatusRaw());
        existing.setExpectedBeneficiaries(fresh.getExpectedBeneficiaries());
        existing.setRecHasPayments(fresh.getRecHasPayments());
        existing.setRecTotalPaid(fresh.getRecTotalPaid());
        existing.setRecPaymentCount(fresh.getRecPaymentCount());

        finishMerge(existing, fresh, run);
        boolean changed = !before.equals(snapshotRecommended(existing));
        return new MergeResult(existing, false, changed);
    }

    /** Merge a completed-endpoint observation. */
    public MergeResult mergeCompleted(Work existing, Work fresh, IngestionRun run) {
        if (existing == null) {
            return new MergeResult(fresh, true, true);
        }
        List<Object> before = snapshotCompleted(existing);

        existing.setWorkDescription(fresh.getWorkDescription());
        existing.setCategory(fresh.getCategory());
        existing.setCategoryNormalized(fresh.getCategoryNormalized());
        copyPeopleAndPlace(existing, fresh);
        existing.setFinalCost(fresh.getFinalCost());
        existing.setCompletedOn(fresh.getCompletedOn());
        existing.setCompletionYear(fresh.getCompletionYear());
        existing.setExpectedBeneficiaries(fresh.getExpectedBeneficiaries());

        finishMerge(existing, fresh, run);
        boolean changed = !before.equals(snapshotCompleted(existing));
        return new MergeResult(existing, false, changed);
    }

    private void copyPeopleAndPlace(Work existing, Work fresh) {
        existing.setMpName(fresh.getMpName());
        existing.setMpNameNormalized(fresh.getMpNameNormalized());
        existing.setConstituency(fresh.getConstituency());
        existing.setConstituencyNormalized(fresh.getConstituencyNormalized());
        existing.setState(fresh.getState());
        existing.setStateNormalized(fresh.getStateNormalized());
        existing.setDistrict(fresh.getDistrict());
        existing.setDistrictNormalized(fresh.getDistrictNormalized());
        existing.setLocationRaw(fresh.getLocationRaw());
    }

    private void finishMerge(Work existing, Work fresh, IngestionRun run) {
        existing.setSeenInRecommended(existing.isSeenInRecommended() || fresh.isSeenInRecommended());
        existing.setSeenInCompleted(existing.isSeenInCompleted() || fresh.isSeenInCompleted());
        existing.setLifecycleState(WorkNormalizer.deriveLifecycle(
                existing.isSeenInRecommended(), existing.isSeenInCompleted()));
        existing.setDataQualityFlags(union(existing.getDataQualityFlags(), fresh.getDataQualityFlags()));
        existing.setSourceResponseAt(fresh.getSourceResponseAt());
        existing.setLastIngestedAt(Instant.now());
        existing.setLastIngestionRun(run);
    }

    /** Union preserving existing order first, then any new flags (Q7). */
    static String[] union(String[] existing, String[] fresh) {
        Set<String> merged = new LinkedHashSet<>();
        if (existing != null) {
            merged.addAll(Arrays.asList(existing));
        }
        if (fresh != null) {
            merged.addAll(Arrays.asList(fresh));
        }
        return merged.toArray(String[]::new);
    }

    // --- change detection ------------------------------------------------
    // Snapshots exclude provenance/audit fields (sourceResponseAt, lastIngestedAt,
    // lastIngestionRun) so a fresh response whose data is unchanged counts as
    // "unchanged" even though the source's lastUpdated moved.

    private List<Object> snapshotRecommended(Work w) {
        return List.of(
                str(w.getWorkDescription()), str(w.getCategory()), str(w.getCategoryNormalized()),
                str(w.getHouse()), str(w.getLsTerm()),
                peopleAndPlace(w),
                str(w.getEstimatedCost()), str(w.getRecommendedOn()), str(w.getRecommendedYear()),
                str(w.getSourceStatusRaw()), str(w.getExpectedBeneficiaries()),
                str(w.getRecHasPayments()), str(w.getRecTotalPaid()), str(w.getRecPaymentCount()),
                w.isSeenInRecommended(), w.isSeenInCompleted(), str(w.getLifecycleState()),
                Arrays.asList(w.getDataQualityFlags()));
    }

    private List<Object> snapshotCompleted(Work w) {
        return List.of(
                str(w.getWorkDescription()), str(w.getCategory()), str(w.getCategoryNormalized()),
                peopleAndPlace(w),
                str(w.getFinalCost()), str(w.getCompletedOn()), str(w.getCompletionYear()),
                str(w.getExpectedBeneficiaries()),
                w.isSeenInRecommended(), w.isSeenInCompleted(), str(w.getLifecycleState()),
                Arrays.asList(w.getDataQualityFlags()));
    }

    private String peopleAndPlace(Work w) {
        return String.join("",
                str(w.getMpName()), str(w.getMpNameNormalized()),
                str(w.getConstituency()), str(w.getConstituencyNormalized()),
                str(w.getState()), str(w.getStateNormalized()),
                str(w.getDistrict()), str(w.getDistrictNormalized()),
                str(w.getLocationRaw()));
    }

    private static String str(Object value) {
        return value == null ? " " : value.toString();
    }
}
