package com.mpladsentinel.mplads.risk;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;

/**
 * Unit tests for {@link RiskEngine} + {@link RiskRuleSet} against a fixed clock
 * (2026-09-01, matching the frontend {@code RISK_REFERENCE_DATE}). One case per
 * rule, plus scoring / banding / UNKNOWN.
 */
@ExtendWith(MockitoExtension.class)
class RiskEngineTest {

    private static final Instant NOW = Instant.parse("2026-09-01T00:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Mock
    private WorkRepository works;
    private RiskEngine engine;

    @BeforeEach
    void setUp() {
        engine = new RiskEngine(works, new RiskRuleSet(), CLOCK);
    }

    private static Work work(long id) {
        return new Work(SourceName.EMPOWERED_INDIAN, id, LifecycleState.RECOMMENDED, true, false, null);
    }

    private RiskAssessment assessOnly(Work... ws) {
        when(works.findAll()).thenReturn(List.of(ws));
        return engine.assessAll().get(0);
    }

    @Test
    void unknownWhenThereIsNothingToAssess() {
        RiskAssessment r = assessOnly(work(1)); // no cost, no payments

        assertThat(r.level()).isEqualTo(RiskLevel.UNKNOWN);
        assertThat(r.score()).isNull();
        assertThat(r.reasons()).isEmpty();
        assertThat(r.assessedAt()).isNull();
    }

    @Test
    void lowAndTimestampedWhenAssessableButNothingFlagged() {
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("1000000"));

        RiskAssessment r = assessOnly(w);

        assertThat(r.level()).isEqualTo(RiskLevel.LOW);
        assertThat(r.score()).isZero();
        assertThat(r.reasons()).isEmpty();
        assertThat(r.assessedAt()).isEqualTo(NOW);
    }

    @Test
    void flagsPaymentOverspendWithThePercentage() {
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("1000000"));
        w.setPaymentDataState(PaymentDataState.FETCHED_PRESENT);
        w.setPaymentTotalPaid(new BigDecimal("1200000"));

        RiskAssessment r = assessOnly(w);

        assertThat(r.reasons()).anyMatch(s -> s.contains("exceed the estimated cost by 20%"));
        assertThat(r.level()).isEqualTo(RiskLevel.HIGH); // overspend 45 + full-payout 45
    }

    @Test
    void flagsFullPayoutBeforeCompletion() {
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("1000000"));
        w.setPaymentDataState(PaymentDataState.FETCHED_PRESENT);
        w.setPaymentTotalPaid(new BigDecimal("950000")); // 95%, not overspent

        RiskAssessment r = assessOnly(w);

        assertThat(r.reasons()).anyMatch(s -> s.contains("95% of the estimated cost released"));
    }

    @Test
    void flagsSingleInstallmentFull() {
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("1000000"));
        w.setPaymentDataState(PaymentDataState.FETCHED_PRESENT);
        w.setPaymentTotalPaid(new BigDecimal("1000000"));
        w.setPaymentInstallments(1);
        w.setSeenInCompleted(true); // suppress the full-payout rule to isolate this one

        RiskAssessment r = assessOnly(w);

        assertThat(r.reasons()).contains("Full amount released in a single installment");
    }

    @Test
    void flagsDormantVeryLongAsHigh() {
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("500000"));
        w.setRecommendedOn(LocalDate.of(2022, 1, 1)); // ~56 months before NOW
        w.setPaymentDataState(PaymentDataState.NOT_FETCHED);

        RiskAssessment r = assessOnly(w);

        assertThat(r.reasons()).anyMatch(s -> s.contains("months ago with no payment records"));
        assertThat(r.reasons()).anyMatch(s -> s.contains("(long-dormant)"));
        assertThat(r.level()).isEqualTo(RiskLevel.HIGH);
    }

    @Test
    void doesNotFlagDormantForARecentRecommendation() {
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("500000"));
        w.setRecommendedOn(LocalDate.of(2026, 6, 1)); // 3 months
        w.setPaymentDataState(PaymentDataState.NOT_FETCHED);

        RiskAssessment r = assessOnly(w);

        assertThat(r.level()).isEqualTo(RiskLevel.LOW);
        assertThat(r.reasons()).isEmpty();
    }

    @Test
    void flagsCostCohortOutlier() {
        List<Work> all = new ArrayList<>();
        Work top = work(1);
        top.setCategory("Roads");
        top.setEstimatedCost(new BigDecimal("9000000"));
        all.add(top);
        for (int i = 0; i < 4; i++) {
            Work peer = work(10 + i);
            peer.setCategory("Roads");
            peer.setEstimatedCost(new BigDecimal("1000000"));
            all.add(peer);
        }
        when(works.findAll()).thenReturn(all);

        RiskAssessment r = engine.assessAll().get(0);
        assertThat(r.reasons()).anyMatch(s -> s.contains("highest for the Roads category"));
    }

    @Test
    void doesNotFlagCohortOutlierBelowTheMinimumCohortSize() {
        List<Work> all = new ArrayList<>();
        for (int i = 0; i < 3; i++) { // only 3 in the category
            Work w = work(i + 1);
            w.setCategory("Roads");
            w.setEstimatedCost(new BigDecimal(i == 0 ? "9000000" : "1000000"));
            all.add(w);
        }
        when(works.findAll()).thenReturn(all);

        assertThat(engine.assessAll().get(0).reasons())
                .noneMatch(s -> s.contains("highest for the"));
    }

    @Test
    void flagsPaymentDataUnavailable() {
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("500000"));
        w.setPaymentDataState(PaymentDataState.FETCH_ERROR);

        assertThat(assessOnly(w).reasons()).contains("Payment data could not be retrieved for review");
    }

    @Test
    void scoreIsCappedAtHundred() {
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("1000000"));
        w.setPaymentDataState(PaymentDataState.FETCHED_PRESENT);
        w.setPaymentTotalPaid(new BigDecimal("5000000")); // overspend + full-payout
        w.setPaymentInstallments(1);                       // + single-installment

        RiskAssessment r = assessOnly(w);
        assertThat(r.score()).isLessThanOrEqualTo(100).isGreaterThan(0);
    }

    @Test
    void singleWorkLookupIsEmptyForAnUnknownId() {
        when(works.findFirstBySourceWorkIdOrderByIdAsc(999L)).thenReturn(Optional.empty());
        assertThat(engine.assess(999L)).isEmpty();
    }

    @Test
    void singleWorkLookupUsesTheCohortAggregateQuery() {
        Work w = work(1);
        w.setCategory("Roads");
        w.setEstimatedCost(new BigDecimal("9000000"));
        when(works.findFirstBySourceWorkIdOrderByIdAsc(1L)).thenReturn(Optional.of(w));
        when(works.categoryCohorts())
                .thenReturn(List.<Object[]>of(new Object[] {"Roads", new BigDecimal("9000000"), 5L}));

        assertThat(engine.assess(1L).orElseThrow().reasons())
                .anyMatch(s -> s.contains("highest for the Roads category"));
    }
}
