package com.mpladsentinel.mplads.dedup;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.mpladsentinel.mplads.domain.Work;

/**
 * Pairwise similarity rules for the de-duplication engine (F7, decision
 * D35). Only ever called on works {@link DuplicateWorkEngine} has already
 * grouped by the same state + district + category — this class decides,
 * within that group, whether a specific pair looks like the same physical
 * work listed more than once.
 *
 * <p>Same style as {@link com.mpladsentinel.mplads.risk.RiskRuleSet} (decision
 * D22): deterministic, explainable, rule-based, no ML. Only real, verified
 * {@code Work} fields are used — {@code workDescription} and
 * {@code estimatedCost} — nothing invented (no photo/image comparison: this
 * project's Flutter field-capture pipeline is camera-only and GPS-geotagged,
 * which already structurally prevents the recycled-photo fraud that kind of
 * check would defend against).
 */
@Component
public class DuplicateRuleSet {

    /** Word-overlap ratio at/above which two descriptions count as "near-identical". */
    static final double TEXT_SIMILARITY_THRESHOLD = 0.6;
    /** Relative cost difference at/below which two estimates count as "overlapping". */
    static final double COST_OVERLAP_THRESHOLD = 0.2;

    private static final int TEXT_SIMILAR_WEIGHT = 60;
    private static final int COST_SIMILAR_WEIGHT = 30;

    private static final Pattern WORD_SPLIT = Pattern.compile("[^a-z0-9]+");

    /** The pair's match, or {@code null} if no signal fired. */
    DuplicatePair evaluate(Work a, Work b) {
        List<String> reasons = new ArrayList<>();
        int score = 0;

        Double textSimilarity = descriptionSimilarity(a.getWorkDescription(), b.getWorkDescription());
        if (textSimilarity != null && textSimilarity >= TEXT_SIMILARITY_THRESHOLD) {
            score += TEXT_SIMILAR_WEIGHT;
            reasons.add("Work descriptions are " + Math.round(textSimilarity * 100)
                    + "% similar (same state, district and category)");
        }

        Double costDiff = relativeCostDifference(a.getEstimatedCost(), b.getEstimatedCost());
        if (costDiff != null && costDiff <= COST_OVERLAP_THRESHOLD) {
            score += COST_SIMILAR_WEIGHT;
            reasons.add("Estimated costs are within " + Math.round(costDiff * 100) + "% of each other");
        }

        if (reasons.isEmpty()) {
            return null;
        }
        int capped = Math.min(100, score);
        return new DuplicatePair(summarize(a), summarize(b), capped,
                DuplicateConfidence.forScore(capped), List.copyOf(reasons));
    }

    // --- signals -----------------------------------------------------

    /** Jaccard similarity over lowercase word tokens, or {@code null} if either side has none. */
    private static Double descriptionSimilarity(String a, String b) {
        Set<String> tokensA = tokenize(a);
        Set<String> tokensB = tokenize(b);
        if (tokensA.isEmpty() || tokensB.isEmpty()) {
            return null;
        }
        Set<String> union = new LinkedHashSet<>(tokensA);
        union.addAll(tokensB);
        Set<String> intersection = new LinkedHashSet<>(tokensA);
        intersection.retainAll(tokensB);
        return (double) intersection.size() / union.size();
    }

    private static Set<String> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return Set.of();
        }
        Set<String> tokens = new LinkedHashSet<>();
        for (String word : WORD_SPLIT.split(text.toLowerCase(Locale.ROOT))) {
            if (word.length() > 2) { // drop very short/common tokens ("of", "a", "in"...)
                tokens.add(word);
            }
        }
        return tokens;
    }

    /** |a-b| ÷ max(a,b), or {@code null} if either cost is missing or non-positive. */
    private static Double relativeCostDifference(BigDecimal a, BigDecimal b) {
        if (a == null || b == null || a.signum() <= 0 || b.signum() <= 0) {
            return null;
        }
        BigDecimal larger = a.max(b);
        BigDecimal diff = a.subtract(b).abs();
        return diff.divide(larger, 4, RoundingMode.HALF_UP).doubleValue();
    }

    private static WorkSummary summarize(Work work) {
        return new WorkSummary(
                work.getSourceWorkId(),
                work.getWorkDescription(),
                work.getState(),
                work.getDistrict(),
                work.getCategory(),
                work.getEstimatedCost());
    }
}
