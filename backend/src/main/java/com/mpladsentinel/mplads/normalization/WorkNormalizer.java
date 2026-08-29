package com.mpladsentinel.mplads.normalization;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.mpladsentinel.mplads.domain.House;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.source.empoweredindian.dto.CompletedWorkDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.MpDetailsDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.RecommendedWorkDto;

/**
 * Maps a verified Empowered Indian work DTO onto the internal {@link Work} model.
 *
 * <p><strong>Pure mapping only.</strong> No HTTP, no persistence, no pagination,
 * no ingestion-run creation, no cross-endpoint merge. The {@link IngestionRun} is
 * supplied by the caller (the future ingestion phase) purely so the produced
 * {@code Work} keeps its mandatory provenance link; this class never starts,
 * looks up or mutates a run.
 *
 * <p>Recommended ({@code /works/recommended}, docs/data-source.md &sect;13.2) and
 * completed ({@code /works/completed}, &sect;13.3) are different source shapes.
 * {@code estimated_cost} lands in {@link Work#getEstimatedCost()};
 * {@code cost} lands in {@link Work#getFinalCost()}; the two are never merged.
 * Each call sets only the {@code seen_in_*} flag for the endpoint it was given
 * and a single-observation {@link LifecycleState}. The both-endpoints
 * {@code RECOMMENDED_AND_COMPLETED} state is an ingestion-time merge concern; use
 * {@link #deriveLifecycle(boolean, boolean)} for it.
 */
@Component
public class WorkNormalizer {

    private static final int STATUS_RAW_MAX = 64;

    /**
     * Normalise one {@code data.recommendedWorks[]} element.
     *
     * @param dto              the verified recommended-work DTO
     * @param sourceResponseAt the response's {@code lastUpdated} (response time,
     *                         not data freshness &mdash; &sect;13.8); may be {@code null}
     * @param run              caller-supplied provenance run (never created here)
     * @throws NormalizationException if {@code workId} is missing or non-positive
     */
    public Work fromRecommended(RecommendedWorkDto dto, Instant sourceResponseAt, IngestionRun run) {
        long sourceWorkId = requireWorkId(dto.workId(), "workId");
        Set<String> flags = new LinkedHashSet<>();

        Work work = new Work(SourceName.EMPOWERED_INDIAN, sourceWorkId,
                LifecycleState.RECOMMENDED, true, false, run);

        applyDescriptive(work, dto.workDescription(), dto.category(), flags);
        applyMp(work, dto.mpDetails(), flags);
        applyLocation(work, dto.location(), dto.district(), dto.state());

        House house = NormalizationSupport.parseHouse(dto.house());
        work.setHouse(house);
        if (NormalizationSupport.trimToNull(dto.house()) != null && house == null) {
            flags.add(DataQualityFlags.UNMAPPED_HOUSE_VALUE);
        }
        work.setLsTerm(NormalizationSupport.toShort(dto.lsTerm(), "lsTerm"));

        work.setEstimatedCost(NormalizationSupport.toMoney(dto.estimatedCost()));
        if (NormalizationSupport.exceedsMoneyScale(dto.estimatedCost())) {
            flags.add(DataQualityFlags.COST_PRECISION_EXCEEDS_DB_SCALE);
        }

        work.setRecommendedOn(dto.recommendedDate());
        work.setRecommendedYear(NormalizationSupport.toShort(dto.recommendedYear(), "recommended_year"));

        String status = NormalizationSupport.trimToNull(dto.status());
        if (status != null && status.length() > STATUS_RAW_MAX) {
            flags.add(DataQualityFlags.STATUS_VALUE_TRUNCATED);
            status = status.substring(0, STATUS_RAW_MAX);
        }
        work.setSourceStatusRaw(status);

        applyBeneficiaries(work, dto.expectedBeneficiaries(), flags);

        // Inline payment signal carried on /recommended (cheap, not authoritative).
        work.setRecHasPayments(dto.hasPayments());
        work.setRecTotalPaid(NormalizationSupport.toMoney(dto.totalPaid()));
        work.setRecPaymentCount(dto.paymentCount());

        applyHiMirrorFlag(flags,
                mirrors(dto.workDescription(), dto.workDescriptionHi()),
                mirrors(dto.category(), dto.categoryHi()),
                mirrors(dto.status(), dto.statusHi()),
                mirrors(dto.location(), dto.locationHi()),
                mirrors(dto.district(), dto.districtHi()),
                mirrors(dto.state(), dto.stateHi()),
                dto.mpDetails() != null && mirrors(dto.mpDetails().name(), dto.mpDetails().nameHi()));

        work.setSourceResponseAt(sourceResponseAt);
        work.setDataQualityFlags(flags.toArray(String[]::new));
        return work;
    }

    /**
     * Normalise one {@code data.completedWorks[]} element. The completed endpoint
     * uses different field names ({@code work_id}, {@code cost},
     * {@code completion_date}/{@code completion_year}, {@code beneficiaries}) and
     * omits {@code house}, {@code lsTerm}, {@code status} and the inline payment
     * fields &mdash; those are left {@code null} without a flag (ordinary absence).
     *
     * @throws NormalizationException if {@code work_id} is missing or non-positive
     */
    public Work fromCompleted(CompletedWorkDto dto, Instant sourceResponseAt, IngestionRun run) {
        long sourceWorkId = requireWorkId(dto.workId(), "work_id");
        Set<String> flags = new LinkedHashSet<>();

        Work work = new Work(SourceName.EMPOWERED_INDIAN, sourceWorkId,
                LifecycleState.COMPLETED, false, true, run);

        applyDescriptive(work, dto.workDescription(), dto.category(), flags);
        applyMp(work, dto.mpDetails(), flags);
        applyLocation(work, dto.location(), dto.district(), dto.state());

        work.setFinalCost(NormalizationSupport.toMoney(dto.cost()));
        if (NormalizationSupport.exceedsMoneyScale(dto.cost())) {
            flags.add(DataQualityFlags.COST_PRECISION_EXCEEDS_DB_SCALE);
        }

        work.setCompletedOn(dto.completionDate());
        work.setCompletionYear(NormalizationSupport.toShort(dto.completionYear(), "completion_year"));

        applyBeneficiaries(work, dto.beneficiaries(), flags);

        applyHiMirrorFlag(flags,
                mirrors(dto.workDescription(), dto.workDescriptionHi()),
                mirrors(dto.category(), dto.categoryHi()),
                mirrors(dto.location(), dto.locationHi()),
                mirrors(dto.district(), dto.districtHi()),
                mirrors(dto.state(), dto.stateHi()),
                dto.mpDetails() != null && mirrors(dto.mpDetails().name(), dto.mpDetails().nameHi()));

        work.setSourceResponseAt(sourceResponseAt);
        work.setDataQualityFlags(flags.toArray(String[]::new));
        return work;
    }

    /**
     * The {@link LifecycleState} implied purely by which endpoint(s) a work has
     * been seen in. {@code RECOMMENDED_AND_COMPLETED} is the anomalous
     * both-endpoints case, <strong>not</strong> a proven transition (&sect;13.6).
     * Reused by the ingestion phase when merging a second observation into an
     * existing work.
     *
     * @throws NormalizationException if neither flag is set (violates
     *                                {@code ck_work_seen_somewhere})
     */
    public static LifecycleState deriveLifecycle(boolean seenInRecommended, boolean seenInCompleted) {
        if (seenInRecommended && seenInCompleted) {
            return LifecycleState.RECOMMENDED_AND_COMPLETED;
        }
        if (seenInCompleted) {
            return LifecycleState.COMPLETED;
        }
        if (seenInRecommended) {
            return LifecycleState.RECOMMENDED;
        }
        throw new NormalizationException("a work must be seen in at least one endpoint");
    }

    private long requireWorkId(Long workId, String sourceField) {
        if (workId == null) {
            throw new NormalizationException("mandatory source identifier '" + sourceField + "' is missing");
        }
        if (workId <= 0) {
            throw new NormalizationException(
                    "source identifier '" + sourceField + "' is not a positive integer: " + workId);
        }
        return workId;
    }

    private void applyDescriptive(Work work, String description, String category, Set<String> flags) {
        String desc = NormalizationSupport.trimToNull(description);
        work.setWorkDescription(desc);
        if (desc == null) {
            flags.add(DataQualityFlags.MISSING_WORK_DESCRIPTION);
        }
        work.setCategory(NormalizationSupport.trimToNull(category));
        work.setCategoryNormalized(NormalizationSupport.toMatchForm(category));
    }

    private void applyMp(Work work, MpDetailsDto mp, Set<String> flags) {
        if (mp == null) {
            flags.add(DataQualityFlags.MP_DETAILS_ABSENT);
            return;
        }
        work.setMpName(NormalizationSupport.trimToNull(mp.name()));
        work.setMpNameNormalized(NormalizationSupport.toMatchForm(mp.name()));
        work.setConstituency(NormalizationSupport.trimToNull(mp.constituency()));
        work.setConstituencyNormalized(NormalizationSupport.toMatchForm(mp.constituency()));
        // mp_details.party is deliberately NOT mapped: the source fills it with
        // the House name, not a party (§13.8).
        if (NormalizationSupport.trimToNull(mp.party()) != null) {
            flags.add(DataQualityFlags.MP_PARTY_FIELD_IS_HOUSE_NOT_PARTY);
        }
    }

    private void applyLocation(Work work, String location, String district, String state) {
        work.setLocationRaw(NormalizationSupport.trimToNull(location));
        work.setDistrict(NormalizationSupport.trimToNull(district));
        work.setDistrictNormalized(NormalizationSupport.toMatchForm(district));
        work.setState(NormalizationSupport.trimToNull(state));
        work.setStateNormalized(NormalizationSupport.toMatchForm(state));
        // implementing_authority_text: the source has no structured
        // implementing-agency field on work records (§13.8). It is left null,
        // never guessed out of the free-text location.
    }

    private void applyBeneficiaries(Work work, Integer beneficiaries, Set<String> flags) {
        work.setExpectedBeneficiaries(beneficiaries);
        if (beneficiaries != null && beneficiaries == 0) {
            flags.add(DataQualityFlags.BENEFICIARIES_FIELD_UNPOPULATED);
        }
    }

    private void applyHiMirrorFlag(Set<String> flags, boolean... mirrorChecks) {
        for (boolean mirrored : mirrorChecks) {
            if (mirrored) {
                flags.add(DataQualityFlags.HI_FIELDS_MIRROR_EN);
                return;
            }
        }
    }

    private static boolean mirrors(String english, String hindi) {
        return NormalizationSupport.mirrors(english, hindi);
    }
}
