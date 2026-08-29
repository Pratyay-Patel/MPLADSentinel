package com.mpladsentinel.mplads.normalization;

import static com.mpladsentinel.mplads.normalization.NormalizationFixtures.completed;
import static com.mpladsentinel.mplads.normalization.NormalizationFixtures.run;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.source.empoweredindian.dto.CompletedWorkDto;

class WorkNormalizerCompletedTest {

    private final WorkNormalizer normalizer = new WorkNormalizer();
    private final IngestionRun run = run(IngestionEndpoint.WORKS_COMPLETED);
    private final Instant responseAt = Instant.parse("2026-08-28T10:39:08.492Z");

    @Test
    void mapsCompletedEndpointFieldNamesOntoTheirOwnColumns() {
        CompletedWorkDto dto = completed().withDistinctHindi().beneficiaries(12).build();

        Work work = normalizer.fromCompleted(dto, responseAt, run);

        assertThat(work.getSourceName()).isEqualTo(SourceName.EMPOWERED_INDIAN);
        // work_id (NOT workId) -> source_work_id
        assertThat(work.getSourceWorkId()).isEqualTo(134_703L);
        // cost (NOT estimated_cost) -> finalCost; estimatedCost stays null
        assertThat(work.getFinalCost()).isEqualByComparingTo("499993.00");
        assertThat(work.getEstimatedCost()).isNull();
        // completion_date / completion_year -> completedOn / completionYear
        assertThat(work.getCompletedOn()).isEqualTo(LocalDate.of(2025, 1, 31));
        assertThat(work.getCompletionYear()).isEqualTo((short) 2025);
        // beneficiaries (NOT expected_beneficiaries) -> expectedBeneficiaries column
        assertThat(work.getExpectedBeneficiaries()).isEqualTo(12);

        assertThat(work.getDistrictNormalized()).isEqualTo("CHITTOOR");
        assertThat(work.getStateNormalized()).isEqualTo("ANDHRA PRADESH");
        assertThat(work.getMpName()).isEqualTo("BISHNU PADA RAY");

        assertThat(work.isSeenInRecommended()).isFalse();
        assertThat(work.isSeenInCompleted()).isTrue();
        assertThat(work.getLifecycleState()).isEqualTo(LifecycleState.COMPLETED);
        assertThat(work.getSourceResponseAt()).isEqualTo(responseAt);
    }

    @Test
    void recommendedOnlyFieldsAreAbsentWithoutBeingFlagged() {
        CompletedWorkDto dto = completed().withDistinctHindi().beneficiaries(3).build();

        Work work = normalizer.fromCompleted(dto, responseAt, run);

        assertThat(work.getHouse()).isNull();
        assertThat(work.getLsTerm()).isNull();
        assertThat(work.getSourceStatusRaw()).isNull();
        assertThat(work.getEstimatedCost()).isNull();
        assertThat(work.getRecommendedOn()).isNull();
        assertThat(work.getRecommendedYear()).isNull();
        assertThat(work.getRecHasPayments()).isNull();
        assertThat(work.getRecTotalPaid()).isNull();
        assertThat(work.getRecPaymentCount()).isNull();
        // those absences are ordinary for /completed -> no data-quality flags at all here
        assertThat(work.getDataQualityFlags()).isEmpty();
    }

    @Test
    void keepsANonIntegerCostExactlyViaBigDecimal() {
        CompletedWorkDto dto = completed().withDistinctHindi().cost(new BigDecimal("545766.98")).build();

        Work work = normalizer.fromCompleted(dto, responseAt, run);

        assertThat(work.getFinalCost()).isEqualByComparingTo("545766.98");
        assertThat(work.getFinalCost().scale()).isEqualTo(2);
        assertThat(work.getDataQualityFlags()).doesNotContain(DataQualityFlags.COST_PRECISION_EXCEEDS_DB_SCALE);
    }

    @Test
    void flagsZeroBeneficiariesAndMirroredHindiOnCompletedToo() {
        CompletedWorkDto dto = completed().beneficiaries(0).build(); // default fixture mirrors *_hi

        Work work = normalizer.fromCompleted(dto, responseAt, run);

        assertThat(work.getDataQualityFlags()).contains(
                DataQualityFlags.BENEFICIARIES_FIELD_UNPOPULATED,
                DataQualityFlags.HI_FIELDS_MIRROR_EN,
                DataQualityFlags.MP_PARTY_FIELD_IS_HOUSE_NOT_PARTY);
    }

    @Test
    void rejectsAMissingWorkId() {
        CompletedWorkDto dto = completed().workId(null).build();

        assertThatThrownBy(() -> normalizer.fromCompleted(dto, responseAt, run))
                .isInstanceOf(NormalizationException.class)
                .hasMessageContaining("work_id");
    }

    @Test
    void deriveLifecycleReflectsObservedEndpointsWithoutImplyingATransition() {
        assertThat(WorkNormalizer.deriveLifecycle(true, false)).isEqualTo(LifecycleState.RECOMMENDED);
        assertThat(WorkNormalizer.deriveLifecycle(false, true)).isEqualTo(LifecycleState.COMPLETED);
        assertThat(WorkNormalizer.deriveLifecycle(true, true)).isEqualTo(LifecycleState.RECOMMENDED_AND_COMPLETED);
        assertThatThrownBy(() -> WorkNormalizer.deriveLifecycle(false, false))
                .isInstanceOf(NormalizationException.class);
    }

    @Test
    void isIdempotentForTheSameSourceRecord() {
        CompletedWorkDto dto = completed().withDistinctHindi().build();

        Work a = normalizer.fromCompleted(dto, responseAt, run);
        Work b = normalizer.fromCompleted(dto, responseAt, run);

        assertThat(a.getSourceWorkId()).isEqualTo(b.getSourceWorkId());
        assertThat(a.getFinalCost()).isEqualByComparingTo(b.getFinalCost());
        assertThat(a.getCompletedOn()).isEqualTo(b.getCompletedOn());
        assertThat(a.getStateNormalized()).isEqualTo(b.getStateNormalized());
        assertThat(a.getLifecycleState()).isEqualTo(b.getLifecycleState());
        assertThat(a.getDataQualityFlags()).containsExactly(b.getDataQualityFlags());
    }
}
