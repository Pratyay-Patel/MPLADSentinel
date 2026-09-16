package com.mpladsentinel.escrow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.risk.RiskAssessment;
import com.mpladsentinel.mplads.risk.RiskEngine;
import com.mpladsentinel.mplads.risk.RiskLevel;

/**
 * Unit tests for {@link FundEligibilityEngine}: each of the two independent
 * checks (fund sufficiency, risk), their combination, and the two decisions
 * they produce. No smart contract, no ML — plain deterministic arithmetic and
 * a lookup against the existing {@link RiskEngine} (D22).
 */
@ExtendWith(MockitoExtension.class)
class FundEligibilityEngineTest {

    @Mock
    private RiskEngine riskEngine;

    private FundEligibilityEngine engine;

    private static Work work(long id) {
        return new Work(SourceName.EMPOWERED_INDIAN, id, LifecycleState.RECOMMENDED, true, false, null);
    }

    @Test
    void rejectsWhenSanctionedAmountIsUnknown() {
        engine = new FundEligibilityEngine(riskEngine);
        Work w = work(1); // no estimatedCost set

        FundEligibilityEngine.Decision decision = engine.evaluate(w, new BigDecimal("100000"));

        assertThat(decision.status()).isEqualTo(FundRequestStatus.REJECTED);
        assertThat(decision.reason()).contains("Sanctioned amount is not available");
    }

    @Test
    void rejectsWhenRequestedAmountExceedsRemainingFunds() {
        engine = new FundEligibilityEngine(riskEngine);
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("500000"));
        // no payments recorded -> remaining = 500000

        FundEligibilityEngine.Decision decision = engine.evaluate(w, new BigDecimal("600000"));

        assertThat(decision.status()).isEqualTo(FundRequestStatus.REJECTED);
        assertThat(decision.reason()).contains("exceeds the remaining sanctioned funds");
    }

    @Test
    void accountsForAlreadyReleasedPaymentsWhenComputingRemaining() {
        engine = new FundEligibilityEngine(riskEngine);
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("500000"));
        w.setPaymentDataState(PaymentDataState.FETCHED_PRESENT);
        w.setPaymentTotalPaid(new BigDecimal("450000")); // remaining = 50000
        // Rejected on the funds check alone, before the risk check ever runs.

        FundEligibilityEngine.Decision decision = engine.evaluate(w, new BigDecimal("60000"));

        assertThat(decision.status()).isEqualTo(FundRequestStatus.REJECTED);
        assertThat(decision.reason()).contains("50000");
    }

    @Test
    void doesNotCountUnfetchedPaymentDataAsAlreadyReleased() {
        engine = new FundEligibilityEngine(riskEngine);
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("500000"));
        w.setPaymentDataState(PaymentDataState.NOT_FETCHED);
        w.setPaymentTotalPaid(new BigDecimal("450000")); // must NOT count -- not FETCHED_PRESENT
        when(riskEngine.assess(1L)).thenReturn(Optional.of(
                new RiskAssessment(1L, RiskLevel.LOW, 0, List.of(), null)));

        FundEligibilityEngine.Decision decision = engine.evaluate(w, new BigDecimal("450000"));

        assertThat(decision.status()).isEqualTo(FundRequestStatus.APPROVED);
    }

    @Test
    void rejectsWhenWorkIsAssessedHighRisk() {
        engine = new FundEligibilityEngine(riskEngine);
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("500000"));
        when(riskEngine.assess(1L)).thenReturn(Optional.of(
                new RiskAssessment(1L, RiskLevel.HIGH, 80, List.of("Recorded payments exceed the estimated cost by 20%"), null)));

        FundEligibilityEngine.Decision decision = engine.evaluate(w, new BigDecimal("100000"));

        assertThat(decision.status()).isEqualTo(FundRequestStatus.REJECTED);
        assertThat(decision.reason()).contains("HIGH risk");
        assertThat(decision.reason()).contains("exceed the estimated cost");
    }

    @Test
    void approvesWhenFundsSufficientAndRiskNotHigh() {
        engine = new FundEligibilityEngine(riskEngine);
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("500000"));
        when(riskEngine.assess(1L)).thenReturn(Optional.of(
                new RiskAssessment(1L, RiskLevel.MEDIUM, 30, List.of("some indicator"), null)));

        FundEligibilityEngine.Decision decision = engine.evaluate(w, new BigDecimal("100000"));

        assertThat(decision.status()).isEqualTo(FundRequestStatus.APPROVED);
        assertThat(decision.reason()).contains("within the remaining sanctioned funds");
    }

    @Test
    void approvesWhenRiskIsUnknown() {
        engine = new FundEligibilityEngine(riskEngine);
        Work w = work(1);
        w.setEstimatedCost(new BigDecimal("500000"));
        when(riskEngine.assess(1L)).thenReturn(Optional.empty());

        FundEligibilityEngine.Decision decision = engine.evaluate(w, new BigDecimal("100000"));

        assertThat(decision.status()).isEqualTo(FundRequestStatus.APPROVED);
    }
}
