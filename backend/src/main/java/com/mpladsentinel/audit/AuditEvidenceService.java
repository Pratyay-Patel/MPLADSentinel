package com.mpladsentinel.audit;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.mpladsentinel.audit.AuditEvidenceResponse.AuditPhoto;

/**
 * Builds the "Field Evidence" section of the Audit Trail page.
 *
 * <p><strong>Demo scope</strong> (see {@code docs/inspections-audit-feature.md}):
 * the Flutter app uploads inspection photos straight to Pinata/IPFS and no
 * inspection JSON reaches the portal yet, so the evidence shown for a work is
 * simply the account's most recent uploads — <em>not</em> photos matched to that
 * work via CIDs in a payload. {@code workId} is accepted for when that mapping
 * is built.
 */
@Service
public class AuditEvidenceService {

    private static final Logger log = LoggerFactory.getLogger(AuditEvidenceService.class);

    private final PinataClient pinata;
    private final PinataProperties properties;

    public AuditEvidenceService(PinataClient pinata, PinataProperties properties) {
        this.pinata = pinata;
        this.properties = properties;
    }

    public AuditEvidenceResponse forWork(long sourceWorkId) {
        if (!properties.configured()) {
            log.debug("Pinata not configured (PINATA_JWT unset) — no evidence for work {}", sourceWorkId);
            return new AuditEvidenceResponse(List.of(), false);
        }
        try {
            List<AuditPhoto> photos = pinata.fetchLatestFiles(properties.evidenceLimit()).stream()
                    .map(file -> new AuditPhoto(
                            file.cid(), file.name(), properties.gatewayUrlFor(file.cid())))
                    .toList();
            return new AuditEvidenceResponse(photos, true);
        } catch (PinataException e) {
            log.warn("Pinata evidence fetch failed for work {}: {}", sourceWorkId, e.getMessage());
            return new AuditEvidenceResponse(List.of(), true);
        }
    }
}
