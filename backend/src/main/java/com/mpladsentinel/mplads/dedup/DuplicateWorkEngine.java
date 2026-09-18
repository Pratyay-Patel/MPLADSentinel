package com.mpladsentinel.mplads.dedup;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;

/**
 * The de-duplication engine (F7, decision D35): flags pairs of ingested
 * works that look like the same physical project listed or sanctioned more
 * than once.
 *
 * <p>Works are grouped by (state, district, category) — comparing works in
 * different locations or sectors isn't meaningful — and every pair within a
 * group is scored by {@link DuplicateRuleSet}. Being in the same group alone
 * never flags a pair: many legitimate, distinct works share a state, district
 * and category, so at least one real signal (near-identical description
 * and/or overlapping estimated cost) must fire before a pair is reported.
 *
 * <p><strong>Caching:</strong> comparing every pair within every group is
 * O(pairs-per-group) — over the full ingested dataset (thousands of works)
 * this is measurably slower than the other list screens (e.g. Risk & Alerts,
 * which is a single O(n) pass with no pairwise comparisons), and works only
 * change when an ingestion run completes, not on every page view. So the
 * result is cached in memory and reused for {@link #CACHE_TTL}, instead of
 * being recomputed synchronously on every request. This trades a small
 * window of staleness (up to {@link #CACHE_TTL} after a fresh ingestion run)
 * for a much faster screen the rest of the time — acceptable since these are
 * investigation indicators, not real-time figures.
 */
@Service
@Transactional(readOnly = true)
public class DuplicateWorkEngine {

    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    private final WorkRepository works;
    private final DuplicateRuleSet ruleSet;
    private final Clock clock;

    private List<DuplicatePair> cachedResult;
    private Instant cachedAt;

    @Autowired
    public DuplicateWorkEngine(WorkRepository works, DuplicateRuleSet ruleSet) {
        this(works, ruleSet, Clock.systemUTC());
    }

    DuplicateWorkEngine(WorkRepository works, DuplicateRuleSet ruleSet, Clock clock) {
        this.works = works;
        this.ruleSet = ruleSet;
        this.clock = clock;
    }

    /**
     * Every candidate duplicate pair across all ingested works — served from
     * the cache when it's still fresh, recomputed otherwise. {@code
     * synchronized} so a cache miss triggers one recomputation, not one per
     * concurrent request.
     */
    public synchronized List<DuplicatePair> findAll() {
        Instant now = clock.instant();
        if (cachedResult != null && Duration.between(cachedAt, now).compareTo(CACHE_TTL) < 0) {
            return cachedResult;
        }
        cachedResult = compute();
        cachedAt = now;
        return cachedResult;
    }

    private List<DuplicatePair> compute() {
        Map<String, List<Work>> groups = groupByLocationAndCategory(works.findAll());
        List<DuplicatePair> pairs = new ArrayList<>();
        for (List<Work> group : groups.values()) {
            if (group.size() < 2) {
                continue;
            }
            for (int i = 0; i < group.size(); i++) {
                for (int j = i + 1; j < group.size(); j++) {
                    DuplicatePair pair = ruleSet.evaluate(group.get(i), group.get(j));
                    if (pair != null) {
                        pairs.add(pair);
                    }
                }
            }
        }
        return pairs;
    }

    // --- grouping ------------------------------------------------------

    private static Map<String, List<Work>> groupByLocationAndCategory(List<Work> all) {
        Map<String, List<Work>> groups = new LinkedHashMap<>();
        for (Work work : all) {
            String key = groupKey(work);
            if (key != null) {
                groups.computeIfAbsent(key, k -> new ArrayList<>()).add(work);
            }
        }
        return groups;
    }

    private static String groupKey(Work work) {
        String state = normalized(work.getStateNormalized(), work.getState());
        String district = normalized(work.getDistrictNormalized(), work.getDistrict());
        String category = normalized(work.getCategoryNormalized(), work.getCategory());
        if (state == null || district == null || category == null) {
            return null;
        }
        return state + "|" + district + "|" + category;
    }

    /** Prefers the pre-computed normalized column; falls back to trim+lowercase of the raw one. */
    private static String normalized(String normalizedColumn, String raw) {
        if (normalizedColumn != null && !normalizedColumn.isBlank()) {
            return normalizedColumn;
        }
        return raw == null || raw.isBlank() ? null : raw.trim().toLowerCase(Locale.ROOT);
    }
}
