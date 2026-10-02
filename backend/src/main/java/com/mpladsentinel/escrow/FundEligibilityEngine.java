package com.mpladsentinel.escrow;

import java.math.BigDecimal;

import org.springframework.stereotype.Component;

import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.risk.RiskAssessment;
import com.mpladsentinel.mplads.risk.RiskEngine;
import com.mpladsentinel.mplads.risk.RiskLevel;

/**
 * Automatic, deterministic eligibility decision for an installment/fund
 * request — the "escrow logic" in the feature spec. Two independent checks,
 * either of which rejects on its own; {@code APPROVED} only when both pass.
 *
 * <p>Same style as the Round-1 {@code RiskEngine} (decision D22): rule-based,
 * explainable, no ML — an application/database-level check, deliberately not
 * a smart contract. Runs synchronously at request creation; there is no later
 * manual approve/reject step.
 */
@Component
public class FundEligibilityEngine {

    private final RiskEngine riskEngine;

    public FundEligibilityEngine(RiskEngine riskEngine) {
        this.riskEngine = riskEngine;
    }

    /** The automatic decision, always with a human-readable {@code reason}. */
    record Decision(FundRequestStatus status, String reason) {
    }

    Decision evaluate(Work work, BigDecimal requestedAmount) {
        BigDecimal estimatedCost = work.getEstimatedCost();
        if (estimatedCost == null) {
            return new Decision(FundRequestStatus.REJECTED,
                    "Sanctioned amount is not available for this work, so eligibility cannot be verified.");
        }

        BigDecimal remaining = remaining(work);
        if (requestedAmount.compareTo(remaining) > 0) {
            return new Decision(FundRequestStatus.REJECTED,
                    "Requested amount (₹" + requestedAmount.toPlainString()
                            + ") exceeds the remaining sanctioned funds (₹" + remaining.toPlainString() + ").");
        }

        RiskAssessment risk = riskEngine.assess(work.getSourceWorkId()).orElse(null);
        if (risk != null && risk.level() == RiskLevel.HIGH) {
            return new Decision(FundRequestStatus.REJECTED,
                    "This work is currently assessed as HIGH risk: " + String.join("; ", risk.reasons()) + ".");
        }

        return new Decision(FundRequestStatus.APPROVED,
                "Requested amount is within the remaining sanctioned funds (₹" + remaining.toPlainString()
                        + ") and the work is not assessed HIGH risk.");
    }

    /** Mirrors {@code RiskRuleSet}'s rule: recorded payments only count once the payments endpoint has returned rows. */
    static BigDecimal alreadyReleased(Work work) {
        return work.getPaymentDataState() == PaymentDataState.FETCHED_PRESENT && work.getPaymentTotalPaid() != null
                ? work.getPaymentTotalPaid()
                : BigDecimal.ZERO;
    }

    /** {@code estimatedCost - alreadyReleased}, or {@code null} when there's no sanctioned amount to compute from. */
    static BigDecimal remaining(Work work) {
        BigDecimal estimatedCost = work.getEstimatedCost();
        return estimatedCost == null ? null : estimatedCost.subtract(alreadyReleased(work));
    }
}
