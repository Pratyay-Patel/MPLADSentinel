package com.mpladsentinel.mplads.risk;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Rule-based risk assessments over the ingested works (decision D22).
 *
 * <ul>
 *   <li>{@code GET /api/works/risk} — every work's assessment (the list screens
 *       read this once instead of one request per work);</li>
 *   <li>{@code GET /api/works/{sourceWorkId}/risk} — one work (the detail page).</li>
 * </ul>
 *
 * <p>Authority-only — matched by the {@code /api/works/**} rule in
 * {@code SecurityConfig}. Risk is not exposed to citizens. The values are
 * investigation indicators, never proof of wrongdoing (§17).
 */
@RestController
@RequestMapping("/api/works")
public class RiskController {

    private final RiskEngine riskEngine;

    public RiskController(RiskEngine riskEngine) {
        this.riskEngine = riskEngine;
    }

    @GetMapping("/risk")
    public List<RiskAssessment> all() {
        return riskEngine.assessAll();
    }



    @GetMapping("/{sourceWorkId}/risk")
    public ResponseEntity<RiskAssessment> forWork(@PathVariable long sourceWorkId) {
        return riskEngine.assess(sourceWorkId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
