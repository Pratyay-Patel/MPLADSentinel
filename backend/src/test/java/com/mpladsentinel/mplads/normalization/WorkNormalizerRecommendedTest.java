package com.mpladsentinel.mplads.normalization;

import static com.mpladsentinel.mplads.normalization.NormalizationFixtures.recommended;
import static com.mpladsentinel.mplads.normalization.NormalizationFixtures.run;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.mpladsentinel.mplads.domain.House;
import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.source.empoweredindian.dto.MpDetailsDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.RecommendedWorkDto;

class WorkNormalizerRecommendedTest {

    private final WorkNormalizer normalizer = new WorkNormalizer();
    private final IngestionRun run = run(IngestionEndpoint.WORKS_RECOMMENDED);
    private final Instant responseAt = Instant.parse("2026-08-28T10:39:08.492Z");

    @Test
    void mapsACompleteRecommendedRecordOntoTheWorkModel() {
        RecommendedWorkDto dto = recommended().withDistinctHindi().expectedBeneficiaries(25).build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getSourceName()).isEqualTo(SourceName.EMPOWERED_INDIAN);
        assertThat(work.getSourceWorkId()).isEqualTo(260_540L);
        assertThat(work.getWorkDescription()).isEqualTo("Extension of CC Road for 120 mtrs at Gonvind Nagar");
        assertThat(work.getCategory()).isEqualTo("Normal/Others");
        assertThat(work.getCategoryNormalized()).isEqualTo("NORMAL/OTHERS");
        assertThat(work.getHouse()).isEqualTo(House.LOK_SABHA);
        assertThat(work.getLsTerm()).isEqualTo((short) 18);
        assertThat(work.getMpName()).isEqualTo("BISHNU PADA RAY");
        assertThat(work.getConstituency()).isEqualTo("ANDAMAN AND NICOBAR ISLANDS");
        assertThat(work.getState()).isEqualTo("Andaman And Nicobar Islands");
        assertThat(work.getStateNormalized()).isEqualTo("ANDAMAN AND NICOBAR ISLANDS");
        assertThat(work.getDistrict()).isEqualTo("ANDAMAN AND NICOBAR ISLANDS");
        assertThat(work.getLocationRaw()).isEqualTo("SOUTH ANDAMANS(Implementing District Authority(SA))");
        assertThat(work.getImplementingAuthorityText()).isNull();

        // estimated_cost -> estimatedCost (NOT finalCost); finalCost stays null
        assertThat(work.getEstimatedCost()).isEqualByComparingTo("2500000.00");
        assertThat(work.getFinalCost()).isNull();
        assertThat(work.getCurrency()).isEqualTo("INR");

        assertThat(work.getRecommendedOn()).isEqualTo(LocalDate.of(2026, 1, 20));
        assertThat(work.getRecommendedYear()).isEqualTo((short) 2026);
        assertThat(work.getCompletedOn()).isNull();
        assertThat(work.getCompletionYear()).isNull();
        assertThat(work.getSourceStatusRaw()).isEqualTo("Recommended");
        assertThat(work.getExpectedBeneficiaries()).isEqualTo(25);

        assertThat(work.isSeenInRecommended()).isTrue();
        assertThat(work.isSeenInCompleted()).isFalse();
        assertThat(work.getLifecycleState()).isEqualTo(LifecycleState.RECOMMENDED);

        assertThat(work.getRecHasPayments()).isFalse();
        assertThat(work.getRecTotalPaid()).isEqualByComparingTo("0.00");
        assertThat(work.getRecPaymentCount()).isZero();

        assertThat(work.getSourceResponseAt()).isEqualTo(responseAt);
        assertThat(work.getLastIngestionRun()).isSameAs(run);

        // party present -> flagged (source misuses it for the House name); hi distinct -> no mirror flag
        assertThat(work.getDataQualityFlags())
                .containsExactly(DataQualityFlags.MP_PARTY_FIELD_IS_HOUSE_NOT_PARTY);
    }

    @Test
    void nullLsTermForRajyaSabhaRecordsIsAnOrdinaryNullNotAFlag() {
        RecommendedWorkDto dto = recommended().withDistinctHindi()
                .house("Rajya Sabha").lsTerm(null).expectedBeneficiaries(5).build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getHouse()).isEqualTo(House.RAJYA_SABHA);
        assertThat(work.getLsTerm()).isNull();
        assertThat(work.getDataQualityFlags())
                .doesNotContain(DataQualityFlags.HI_FIELDS_MIRROR_EN, DataQualityFlags.MISSING_WORK_DESCRIPTION);
    }

    @Test
    void nullOptionalFieldsArePreservedAsNull() {
        RecommendedWorkDto dto = recommended().withDistinctHindi()
                .recommendedDate(null).recommendedYear(null).status(null)
                .estimatedCost(null).hasPayments(null).totalPaid(null).paymentCount(null)
                .expectedBeneficiaries(null).build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getRecommendedOn()).isNull();
        assertThat(work.getRecommendedYear()).isNull();
        assertThat(work.getSourceStatusRaw()).isNull();
        assertThat(work.getEstimatedCost()).isNull();
        assertThat(work.getRecHasPayments()).isNull();
        assertThat(work.getRecTotalPaid()).isNull();
        assertThat(work.getRecPaymentCount()).isNull();
        assertThat(work.getExpectedBeneficiaries()).isNull();
        // none of those ordinary nulls produce a data-quality flag
        assertThat(work.getDataQualityFlags())
                .containsExactly(DataQualityFlags.MP_PARTY_FIELD_IS_HOUSE_NOT_PARTY);
    }

    @Test
    void preservesBigDecimalCostExactlyAtDbScale() {
        RecommendedWorkDto dto = recommended().withDistinctHindi()
                .estimatedCost(new BigDecimal("2500000")).build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getEstimatedCost()).isEqualByComparingTo("2500000");
        assertThat(work.getEstimatedCost().scale()).isEqualTo(2);
        assertThat(work.getDataQualityFlags()).doesNotContain(DataQualityFlags.COST_PRECISION_EXCEEDS_DB_SCALE);
    }

    @Test
    void flagsACostThatCarriesMorePrecisionThanTheColumnKeeps() {
        RecommendedWorkDto dto = recommended().withDistinctHindi()
                .estimatedCost(new BigDecimal("100.005")).build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getEstimatedCost().scale()).isEqualTo(2);
        assertThat(work.getDataQualityFlags()).contains(DataQualityFlags.COST_PRECISION_EXCEEDS_DB_SCALE);
    }

    @Test
    void mapsMpDetailsAndNormalisesMatchColumns() {
        RecommendedWorkDto dto = recommended().withDistinctHindi()
                .mpDetails(new MpDetailsDto("  bishnu  pada   ray ", "x", "andaman", null)).build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        // raw value only has surrounding whitespace stripped
        assertThat(work.getMpName()).isEqualTo(dto.mpDetails().name().strip());
        // *_normalized collapses internal whitespace and upper-cases for matching
        assertThat(work.getMpNameNormalized()).isEqualTo("BISHNU PADA RAY");
        assertThat(work.getConstituencyNormalized()).isEqualTo("ANDAMAN");
        assertThat(work.getDataQualityFlags()).doesNotContain(DataQualityFlags.MP_PARTY_FIELD_IS_HOUSE_NOT_PARTY);
    }

    @Test
    void flagsAbsentMpDetailsAndAbsentDescription() {
        RecommendedWorkDto dto = recommended().withDistinctHindi()
                .workDescription("   ").mpDetails(null).build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getWorkDescription()).isNull();
        assertThat(work.getMpName()).isNull();
        assertThat(work.getDataQualityFlags())
                .contains(DataQualityFlags.MISSING_WORK_DESCRIPTION, DataQualityFlags.MP_DETAILS_ABSENT);
    }

    @Test
    void flagsAContentlessDescriptionAsUnreadableButKeepsTheVerbatimValue() {
        RecommendedWorkDto dto = recommended().withDistinctHindi()
                .workDescription("?? ?? ??0?0??0   ??").build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getWorkDescription()).isEqualTo("?? ?? ??0?0??0   ??"); // kept verbatim
        assertThat(work.getDataQualityFlags())
                .contains(DataQualityFlags.UNREADABLE_WORK_DESCRIPTION)
                .doesNotContain(DataQualityFlags.MISSING_WORK_DESCRIPTION);
    }

    @Test
    void trimsLeadingSeparatorNoiseFromAnOtherwiseGoodDescription() {
        RecommendedWorkDto dto = recommended().withDistinctHindi()
                .workDescription(", Construction of paver block road at Palaswadi").build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getWorkDescription()).isEqualTo("Construction of paver block road at Palaswadi");
        assertThat(work.getDataQualityFlags())
                .doesNotContain(DataQualityFlags.UNREADABLE_WORK_DESCRIPTION,
                        DataQualityFlags.MISSING_WORK_DESCRIPTION);
    }

    @Test
    void treatsADescriptionOfOnlyPunctuationAsMissing() {
        RecommendedWorkDto dto = recommended().withDistinctHindi()
                .workDescription(" , , , , ").build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getWorkDescription()).isNull();
        assertThat(work.getDataQualityFlags()).contains(DataQualityFlags.MISSING_WORK_DESCRIPTION);
    }

    @Test
    void flagsHindiFieldsThatMirrorEnglish() {
        RecommendedWorkDto dto = recommended().build(); // default fixture mirrors all *_hi

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getDataQualityFlags()).contains(DataQualityFlags.HI_FIELDS_MIRROR_EN);
    }

    @Test
    void flagsZeroBeneficiariesAsUnpopulated() {
        RecommendedWorkDto dto = recommended().withDistinctHindi().expectedBeneficiaries(0).build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getExpectedBeneficiaries()).isZero();
        assertThat(work.getDataQualityFlags()).contains(DataQualityFlags.BENEFICIARIES_FIELD_UNPOPULATED);
    }

    @Test
    void flagsAnUnmappedHouseValueAndStoresNull() {
        RecommendedWorkDto dto = recommended().withDistinctHindi().house("Vidhan Sabha").build();

        Work work = normalizer.fromRecommended(dto, responseAt, run);

        assertThat(work.getHouse()).isNull();
        assertThat(work.getDataQualityFlags()).contains(DataQualityFlags.UNMAPPED_HOUSE_VALUE);
    }

    @Test
    void rejectsAMissingWorkId() {
        RecommendedWorkDto dto = recommended().workId(null).build();

        assertThatThrownBy(() -> normalizer.fromRecommended(dto, responseAt, run))
                .isInstanceOf(NormalizationException.class)
                .hasMessageContaining("workId");
    }

    @Test
    void isIdempotentForTheSameSourceRecord() {
        RecommendedWorkDto dto = recommended().withDistinctHindi().build();

        Work a = normalizer.fromRecommended(dto, responseAt, run);
        Work b = normalizer.fromRecommended(dto, responseAt, run);

        // normalisation-derived values are identical run to run (audit timestamps are not compared)
        assertThat(a.getSourceWorkId()).isEqualTo(b.getSourceWorkId());
        assertThat(a.getWorkDescription()).isEqualTo(b.getWorkDescription());
        assertThat(a.getCategoryNormalized()).isEqualTo(b.getCategoryNormalized());
        assertThat(a.getEstimatedCost()).isEqualByComparingTo(b.getEstimatedCost());
        assertThat(a.getStateNormalized()).isEqualTo(b.getStateNormalized());
        assertThat(a.getLifecycleState()).isEqualTo(b.getLifecycleState());
        assertThat(a.getDataQualityFlags()).containsExactly(b.getDataQualityFlags());
    }
}
