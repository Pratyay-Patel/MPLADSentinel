package com.mpladsentinel.mplads.dedup;

import java.util.Comparator;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * De-duplication of works (F7, decision D35): flags pairs of ingested
 * works that look like the same physical project listed or sanctioned more
 * than once, using real project fields only (state, district, category,
 * description text, estimated cost).
 *
 * <p>{@code GET /api/works/duplicates} — authority-only, matched by the
 * existing {@code /api/works/**} rule in {@code SecurityConfig} (same role set
 * as risk). These are investigation indicators, never proof of wrongdoing
 * (§17), same as risk.
 */
@RestController
@RequestMapping("/api/works")
public class DuplicateController {

    /**
     * Across the full ingested dataset the engine can surface tens of
     * thousands of candidate pairs (e.g. ~29,000 across 6,044 works).
     * Returning all of them serialises and transmits far more data than any
     * reviewer will ever look at, so the response is capped to the
     * highest-scoring pairs. This does not reduce {@link DuplicateWorkEngine}'s
     * own O(pairs-per-group) comparison cost — only the JSON
     * serialization/transfer cost of the discarded tail. Kept in sync by
     * hand with the frontend's own cap for the demo build
     * (`MAX_DUPLICATE_PAIRS` in `dedup/duplicateRules.ts`).
     */
    static final int MAX_RETURNED_PAIRS = 9_999;

    private final DuplicateWorkEngine engine;

    public DuplicateController(DuplicateWorkEngine engine) {
        this.engine = engine;
    }

    @GetMapping("/duplicates")
    public DuplicatePairsResponse all() {
        List<DuplicatePair> all = engine.findAll();
        List<DuplicatePair> capped = all.stream()
                .sorted(Comparator.comparingInt(DuplicatePair::score).reversed())
                .limit(MAX_RETURNED_PAIRS)
                .toList();
        return new DuplicatePairsResponse(capped, all.size());
    }
}
