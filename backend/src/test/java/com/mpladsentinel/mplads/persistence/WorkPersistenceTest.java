package com.mpladsentinel.mplads.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import com.mpladsentinel.mplads.domain.House;
import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.IngestionTrigger;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.IngestionRunRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@SpringBootTest
@Transactional
class WorkPersistenceTest extends AbstractPostgresIntegrationTest {

    /** Unique source_work_id per test method so the shared DB stays collision-free. */
    private static final AtomicLong SEQ = new AtomicLong(1_000_000_000L);

    @Autowired
    private WorkRepository workRepository;
    @Autowired
    private IngestionRunRepository ingestionRunRepository;
    @PersistenceContext
    private EntityManager em;

    private IngestionRun newRun() {
        return ingestionRunRepository.save(new IngestionRun(
                SourceName.EMPOWERED_INDIAN, IngestionEndpoint.WORKS_RECOMMENDED,
                "https://api.empoweredindian.in/api", IngestionTrigger.MANUAL,
                IngestionRunStatus.RUNNING));
    }

    private Work newRecommendedWork(long sourceWorkId, IngestionRun run) {
        return new Work(SourceName.EMPOWERED_INDIAN, sourceWorkId,
                LifecycleState.RECOMMENDED, true, false, run);
    }

    @Test
    void persistsAndReadsBackEveryVerifiedFieldType() {
        IngestionRun run = newRun();
        long swid = SEQ.incrementAndGet();

        Work work = newRecommendedWork(swid, run);
        work.setWorkDescription("Extension of CC Road for 120 mtrs at Gonvind Nagar");
        work.setCategory("Normal/Others");
        work.setCategoryNormalized("NORMAL/OTHERS");
        work.setHouse(House.LOK_SABHA);
        work.setLsTerm((short) 18);
        work.setMpName("BISHNU PADA RAY");
        work.setMpNameNormalized("BISHNU PADA RAY");
        work.setConstituency("ANDAMAN AND NICOBAR ISLANDS");
        work.setConstituencyNormalized("ANDAMAN AND NICOBAR ISLANDS");
        work.setState("Andaman And Nicobar Islands");
        work.setStateNormalized("ANDAMAN AND NICOBAR ISLANDS");
        work.setDistrict("ANDAMAN AND NICOBAR ISLANDS");
        work.setDistrictNormalized("ANDAMAN AND NICOBAR ISLANDS");
        work.setLocationRaw("SOUTH ANDAMANS(Implementing District Authority(SA))");
        work.setEstimatedCost(new BigDecimal("2500000.00"));
        work.setRecommendedOn(LocalDate.of(2026, 1, 20));
        work.setRecommendedYear((short) 2026);
        work.setSourceStatusRaw("Recommended");
        work.setExpectedBeneficiaries(0);
        work.setRecHasPayments(Boolean.FALSE);
        work.setRecTotalPaid(new BigDecimal("0.00"));
        work.setRecPaymentCount(0);
        work.setDataQualityFlags(new String[] {"HI_FIELDS_MIRROR_EN", "BENEFICIARIES_LIKELY_UNPOPULATED"});

        Work saved = workRepository.saveAndFlush(work);
        Long id = saved.getId();
        em.clear();

        Work read = workRepository.findById(id).orElseThrow();
        assertThat(read.getSourceName()).isEqualTo(SourceName.EMPOWERED_INDIAN);
        assertThat(read.getSourceWorkId()).isEqualTo(swid);
        assertThat(read.getWorkDescription()).startsWith("Extension of CC Road");
        assertThat(read.getCategory()).isEqualTo("Normal/Others");
        assertThat(read.getHouse()).isEqualTo(House.LOK_SABHA);
        assertThat(read.getLsTerm()).isEqualTo((short) 18);
        assertThat(read.getState()).isEqualTo("Andaman And Nicobar Islands");
        assertThat(read.getEstimatedCost()).isEqualByComparingTo("2500000.00");
        assertThat(read.getCurrency()).isEqualTo("INR");
        assertThat(read.getRecommendedOn()).isEqualTo(LocalDate.of(2026, 1, 20));
        assertThat(read.getRecommendedYear()).isEqualTo((short) 2026);
        assertThat(read.getSourceStatusRaw()).isEqualTo("Recommended");
        assertThat(read.getExpectedBeneficiaries()).isZero();
        assertThat(read.getLifecycleState()).isEqualTo(LifecycleState.RECOMMENDED);
        assertThat(read.isSeenInRecommended()).isTrue();
        assertThat(read.isSeenInCompleted()).isFalse();
        assertThat(read.getDataQualityFlags())
                .containsExactly("HI_FIELDS_MIRROR_EN", "BENEFICIARIES_LIKELY_UNPOPULATED");
        assertThat(read.getCreatedAt()).isNotNull();
        assertThat(read.getUpdatedAt()).isNotNull();
        assertThat(read.getLastIngestionRun().getId()).isEqualTo(run.getId());
    }

    @Test
    void naturalKeyLookupReturnsTheWork() {
        IngestionRun run = newRun();
        long swid = SEQ.incrementAndGet();
        workRepository.saveAndFlush(newRecommendedWork(swid, run));
        em.clear();

        Optional<Work> found = workRepository.findBySourceNameAndSourceWorkId(
                SourceName.EMPOWERED_INDIAN, swid);
        assertThat(found).isPresent();
        assertThat(workRepository.existsBySourceNameAndSourceWorkId(SourceName.EMPOWERED_INDIAN, swid))
                .isTrue();
    }

    @Test
    void duplicateNaturalKeyIsRejected() {
        IngestionRun run = newRun();
        long swid = SEQ.incrementAndGet();
        workRepository.saveAndFlush(newRecommendedWork(swid, run));

        Work duplicate = newRecommendedWork(swid, run);
        assertThatThrownBy(() -> workRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void seenSomewhereConstraintIsEnforced() {
        IngestionRun run = newRun();
        Work orphan = new Work(SourceName.EMPOWERED_INDIAN, SEQ.incrementAndGet(),
                LifecycleState.RECOMMENDED, false, false, run);

        assertThatThrownBy(() -> workRepository.saveAndFlush(orphan))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void negativeEstimatedCostIsRejected() {
        IngestionRun run = newRun();
        Work work = newRecommendedWork(SEQ.incrementAndGet(), run);
        work.setEstimatedCost(new BigDecimal("-1.00"));

        assertThatThrownBy(() -> workRepository.saveAndFlush(work))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void dataQualityFlagsRoundTripIncludingEmpty() {
        IngestionRun run = newRun();
        Work empty = newRecommendedWork(SEQ.incrementAndGet(), run);
        Work saved = workRepository.saveAndFlush(empty);
        em.clear();

        assertThat(workRepository.findById(saved.getId()).orElseThrow().getDataQualityFlags())
                .isEmpty();
    }

    @Test
    void paymentDataStateDefaultsToNotFetchedAndAbsentIsNotZeroExpenditure() {
        IngestionRun run = newRun();

        Work notFetched = newRecommendedWork(SEQ.incrementAndGet(), run);
        Work absent = newRecommendedWork(SEQ.incrementAndGet(), run);
        absent.setPaymentDataState(PaymentDataState.FETCHED_ABSENT);

        Long notFetchedId = workRepository.saveAndFlush(notFetched).getId();
        Long absentId = workRepository.saveAndFlush(absent).getId();
        em.clear();

        Work reNotFetched = workRepository.findById(notFetchedId).orElseThrow();
        Work reAbsent = workRepository.findById(absentId).orElseThrow();

        assertThat(reNotFetched.getPaymentDataState()).isEqualTo(PaymentDataState.NOT_FETCHED);
        assertThat(reAbsent.getPaymentDataState()).isEqualTo(PaymentDataState.FETCHED_ABSENT);
        // "absent" and "not fetched" are distinct, and NEITHER sets a paid amount.
        assertThat(reNotFetched.getPaymentTotalPaid()).isNull();
        assertThat(reAbsent.getPaymentTotalPaid()).isNull();
    }

    @Test
    void estimatedAndFinalCostAreStoredAsSeparateConcepts() {
        IngestionRun run = newRun();
        Work work = new Work(SourceName.EMPOWERED_INDIAN, SEQ.incrementAndGet(),
                LifecycleState.RECOMMENDED_AND_COMPLETED, true, true, run);
        work.setEstimatedCost(new BigDecimal("2500000.00")); // from /recommended
        work.setFinalCost(new BigDecimal("2450000.00"));     // from /completed
        Long id = workRepository.saveAndFlush(work).getId();
        em.clear();

        Work read = workRepository.findById(id).orElseThrow();
        assertThat(read.getEstimatedCost()).isEqualByComparingTo("2500000.00");
        assertThat(read.getFinalCost()).isEqualByComparingTo("2450000.00");
        assertThat(read.getLifecycleState()).isEqualTo(LifecycleState.RECOMMENDED_AND_COMPLETED);
    }
}
