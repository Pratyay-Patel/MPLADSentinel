package com.mpladsentinel.mplads.risk;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.mplads.risk.RiskContext.CategoryCohort;
import com.mpladsentinel.mplads.risk.RiskRuleSet.RuleHit;

/**
 * The Round-1 rule/statistical risk engine (decision D22): evaluates
 * {@link RiskRuleSet} over the ingested works and bands the result.
 *
 * <ul>
 *   <li>score = Σ rule weights, capped at 100;</li>
 *   <li>{@code UNKNOWN} when nothing fired and there is nothing to assess
 *       (no cost figures, no confirmed payments) — distinct from a clean
 *       {@code LOW};</li>
 *   <li>deterministic: the only time-varying output is {@code assessedAt}
 *       (an injected {@link Clock} keeps tests fixed).</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class RiskEngine {

    private final WorkRepository works;
    private final RiskRuleSet ruleSet;
    private final Clock clock;

    public RiskEngine(WorkRepository works, RiskRuleSet ruleSet, Clock clock) {
        this.works = works;
        this.ruleSet = ruleSet;
        this.clock = clock;
    }

    /** Risk for every ingested work, keyed by source id. Order follows the repository. */
    public List<RiskAssessment> assessAll() {
        List<Work> all = works.findAll();
        RiskContext ctx = new RiskContext(now(), asOfDate(), cohortsFrom(all));
        return all.stream().map(work -> assess(work, ctx)).toList();
    }

    /** Risk for one work, or {@link Optional#empty()} if no work has that source id. */
    public Optional<RiskAssessment> assess(long sourceWorkId) {
        return works.findFirstBySourceWorkIdOrderByIdAsc(sourceWorkId)
                .map(work -> {
                    RiskContext ctx = new RiskContext(now(), asOfDate(), cohortsFromAggregate());
                    return assess(work, ctx);
                });
    }

    // --- internals ---------------------------------------------------

    private RiskAssessment assess(Work work, RiskContext ctx) {
        List<RuleHit> hits = ruleSet.evaluate(work, ctx);
        if (hits.isEmpty() && !isAssessable(work)) {
            return RiskAssessment.unknown(work.getSourceWorkId());
        }
        int score = Math.min(100, hits.stream().mapToInt(RuleHit::weight).sum());
        return new RiskAssessment(
                work.getSourceWorkId(),
                RiskLevel.forScore(score),
                score,
                hits.stream().map(RuleHit::reason).toList(),
                ctx.now());
    }

    private static boolean isAssessable(Work work) {
        return work.getEstimatedCost() != null
                || work.getFinalCost() != null
                || work.getPaymentDataState() == com.mpladsentinel.mplads.domain.PaymentDataState.FETCHED_PRESENT;
    }

    private Instant now() {
        return Instant.now(clock);
    }

    private LocalDate asOfDate() {
        return LocalDate.ofInstant(Instant.now(clock), ZoneOffset.UTC);
    }

    /** Cohort map from an in-memory work set (bulk path). */
    private static Map<String, CategoryCohort> cohortsFrom(List<Work> all) {
        Map<String, BigDecimal> max = new LinkedHashMap<>();
        Map<String, Integer> size = new LinkedHashMap<>();
        for (Work work : all) {
            String category = work.getCategory();
            BigDecimal est = work.getEstimatedCost();
            if (category == null || est == null) {
                continue;
            }
            max.merge(category, est, (a, b) -> a.compareTo(b) >= 0 ? a : b);
            size.merge(category, 1, Integer::sum);
        }
        Map<String, CategoryCohort> cohorts = new LinkedHashMap<>();
        max.forEach((category, m) -> cohorts.put(category, new CategoryCohort(m, size.get(category))));
        return cohorts;
    }

    /** Cohort map from a single GROUP BY query (single-work path). */
    private Map<String, CategoryCohort> cohortsFromAggregate() {
        Map<String, CategoryCohort> cohorts = new LinkedHashMap<>();
        for (Object[] row : works.categoryCohorts()) {
            cohorts.put((String) row[0],
                    new CategoryCohort((BigDecimal) row[1], ((Number) row[2]).intValue()));
        }
        return cohorts;
    }
}
