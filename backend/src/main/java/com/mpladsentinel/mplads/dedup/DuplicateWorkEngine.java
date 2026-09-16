package com.mpladsentinel.mplads.dedup;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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
 */
@Service
@Transactional(readOnly = true)
public class DuplicateWorkEngine {

    private final WorkRepository works;
    private final DuplicateRuleSet ruleSet;

    public DuplicateWorkEngine(WorkRepository works, DuplicateRuleSet ruleSet) {
        this.works = works;
        this.ruleSet = ruleSet;
    }

    /** Every candidate duplicate pair across all ingested works. */
    public List<DuplicatePair> findAll() {
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
