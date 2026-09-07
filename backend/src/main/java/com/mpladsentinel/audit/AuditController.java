package com.mpladsentinel.audit;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Audit Trail evidence API. {@code GET /api/audit/{workId}/photos} returns the
 * field-evidence images for a work's Audit Trail (see
 * {@code docs/inspections-audit-feature.md}). Any government role may read it
 * (enforced in {@code SecurityConfig}). The Pinata JWT never leaves the backend.
 */
@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditEvidenceService service;

    public AuditController(AuditEvidenceService service) {
        this.service = service;
    }

    @GetMapping("/{workId}/photos")
    public AuditEvidenceResponse photos(@PathVariable long workId) {
        return service.forWork(workId);
    }
}
