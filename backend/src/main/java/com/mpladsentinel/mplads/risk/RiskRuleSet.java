package com.mpladsentinel.mplads.risk;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.Work;

/**
 * The Round-1 rule set (decision D22). A direct port of
 * {@code frontend/src/data/risk/rules.ts} — same rule ids, weights and
 * thresholds — kept in sync by hand. Every rule uses only fields the verified
 * MPLADS source provides (docs/data-source.md §14): no physical-progress,
 * geospatial, duplicate-project or delay-prediction rule.
 *
 * <p>These are investigation indicators, not proof of wrongdoing (§17).
 */
@Component
public class RiskRuleSet {

    private static final int OVERSPEND_WEIGHT = 45;
    private static final int FULL_PAYOUT_WEIGHT = 45;
    private static final int SINGLE_INSTALLMENT_WEIGHT = 25;
    private static final int COHORT_OUTLIER_WEIGHT = 25;
    private static final int PAYMENT_DATA_UNAVAILABLE_WEIGHT = 25;

    private static final int DORMANT_MONTHS = 12;
    private static final int DORMANT_LONG_MONTHS = 24;
    private static final int DORMANT_VERY_LONG_MONTHS = 36;
    private static final int COHORT_MIN_SIZE = 4;

    /** One matched rule. */
    record RuleHit(String ruleId, String reason, int weight) {
    }

    /** All rules that fire for {@code work}, in a stable order. */
    List<RuleHit> evaluate(Work work, RiskContext ctx) {
        List<RuleHit> hits = new ArrayList<>();
        addIfPresent(hits, overspend(work));
        addIfPresent(hits, fullPayoutBeforeCompletion(work));
        addIfPresent(hits, singleInstallmentFull(work));
        addIfPresent(hits, dormantNoPayments(work, ctx));
        addIfPresent(hits, costCohortOutlier(work, ctx));
        addIfPresent(hits, paymentDataUnavailable(work));
        return hits;
    }

    // --- rules -----------------------------------------------------------

    private RuleHit overspend(Work work) {
        BigDecimal est = work.getEstimatedCost();
        BigDecimal paid = recordedPayments(work);
        if (est == null || paid == null || paid.compareTo(est) <= 0) {
            return null;
        }
        return new RuleHit("PAYMENT_OVERSPEND",
                "Recorded payments exceed the estimated cost by " + pctOver(paid, est) + "%",
                OVERSPEND_WEIGHT);
    }

    private RuleHit fullPayoutBeforeCompletion(Work work) {
        if (work.isSeenInCompleted()) {
            return null;
        }
        Double ratio = paymentRatio(work);
        if (ratio == null || ratio < 0.9) {
            return null;
        }
        return new RuleHit("FULL_PAYOUT_BEFORE_COMPLETION",
                Math.round(ratio * 100) + "% of the estimated cost released "
                        + "while the work is not marked complete",
                FULL_PAYOUT_WEIGHT);
    }

    private RuleHit singleInstallmentFull(Work work) {
        Double ratio = paymentRatio(work);
        if (!Integer.valueOf(1).equals(work.getPaymentInstallments()) || ratio == null || ratio < 0.95) {
            return null;
        }
        return new RuleHit("SINGLE_INSTALLMENT_FULL",
                "Full amount released in a single installment", SINGLE_INSTALLMENT_WEIGHT);
    }

    private RuleHit dormantNoPayments(Work work, RiskContext ctx) {
        if (work.isSeenInCompleted()) {
            return null;
        }
        PaymentDataState state = work.getPaymentDataState();
        if (state != PaymentDataState.NOT_FETCHED && state != PaymentDataState.FETCHED_ABSENT) {
            return null;
        }
        LocalDate recommended = recommendedDate(work);
        if (recommended == null) {
            return null;
        }
        long months = monthsSince(recommended, ctx.asOfDate());
        if (months < DORMANT_MONTHS) {
            return null;
        }
        int weight = months >= DORMANT_VERY_LONG_MONTHS ? 55 : months >= DORMANT_LONG_MONTHS ? 45 : 30;
        String tail = months >= DORMANT_VERY_LONG_MONTHS ? " (long-dormant)" : "";
        return new RuleHit("DORMANT_NO_PAYMENTS",
                "Recommended " + months + " months ago with no payment records" + tail, weight);
    }

    private RuleHit costCohortOutlier(Work work, RiskContext ctx) {
        BigDecimal est = work.getEstimatedCost();
        String category = work.getCategory();
        if (est == null || category == null) {
            return null;
        }
        RiskContext.CategoryCohort cohort = ctx.cohortFor(category);
        if (cohort == null || cohort.size() < COHORT_MIN_SIZE) {
            return null;
        }
        if (est.compareTo(cohort.maxEstimatedCost()) < 0) {
            return null;
        }
        return new RuleHit("COST_COHORT_OUTLIER",
                "Estimated cost is the highest for the " + category + " category in the dataset",
                COHORT_OUTLIER_WEIGHT);
    }

    private RuleHit paymentDataUnavailable(Work work) {
        if (work.getPaymentDataState() != PaymentDataState.FETCH_ERROR) {
            return null;
        }
        return new RuleHit("PAYMENT_DATA_UNAVAILABLE",
                "Payment data could not be retrieved for review", PAYMENT_DATA_UNAVAILABLE_WEIGHT);
    }

    // --- shared helpers ------------------------------------------------

    /**
     * Recorded payments only count once the payments endpoint has actually
     * returned rows — matches how the frontend derives {@code recordedPayments}.
     */
    private static BigDecimal recordedPayments(Work work) {
        return work.getPaymentDataState() == PaymentDataState.FETCHED_PRESENT
                ? work.getPaymentTotalPaid()
                : null;
    }

    /** recorded ÷ estimated, when both are known and the estimate is positive. */
    private static Double paymentRatio(Work work) {
        BigDecimal est = work.getEstimatedCost();
        BigDecimal paid = recordedPayments(work);
        if (paid == null || est == null || est.signum() <= 0) {
            return null;
        }
        return paid.doubleValue() / est.doubleValue();
    }

    private static long pctOver(BigDecimal a, BigDecimal b) {
        return Math.round((a.doubleValue() / b.doubleValue() - 1) * 100);
    }

    private static LocalDate recommendedDate(Work work) {
        if (work.getRecommendedOn() != null) {
            return work.getRecommendedOn();
        }
        Short year = work.getRecommendedYear();
        return year == null ? null : LocalDate.of(year, 6, 30);
    }

    private static long monthsSince(LocalDate date, LocalDate asOf) {
        return Math.max(0, ChronoUnit.MONTHS.between(date, asOf));
    }

    private static void addIfPresent(List<RuleHit> hits, RuleHit hit) {
        if (hit != null) {
            hits.add(hit);
        }
    }
}
