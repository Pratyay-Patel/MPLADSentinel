package com.mpladsentinel.mplads.dedup;

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

    private final DuplicateWorkEngine engine;

    public DuplicateController(DuplicateWorkEngine engine) {
        this.engine = engine;
    }

    @GetMapping("/duplicates")
    public List<DuplicatePair> all() {
        return engine.findAll();
    }
}
