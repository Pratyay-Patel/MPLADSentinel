package com.mpladsentinel.mplads.risk;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

/**
 * Everything the rules need beyond the work itself: the assessment time and the
 * per-category cost cohorts (for {@code COST_COHORT_OUTLIER}).
 *
 * @param now        assessment timestamp (goes on {@link RiskAssessment#assessedAt()})
 * @param asOfDate   {@code now} as a UTC date, for "months since recommended" maths
 * @param cohorts    category → {@link CategoryCohort}; only categories with at least
 *                   one costed work appear
 */
record RiskContext(Instant now, LocalDate asOfDate, Map<String, CategoryCohort> cohorts) {

    /** @param maxEstimatedCost the largest estimated cost in the category; {@code size} costed works in it */
    record CategoryCohort(BigDecimal maxEstimatedCost, int size) {
    }

    CategoryCohort cohortFor(String category) {
        return category == null ? null : cohorts.get(category);
    }
}
