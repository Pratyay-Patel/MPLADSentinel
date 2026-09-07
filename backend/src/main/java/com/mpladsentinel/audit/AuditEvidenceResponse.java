package com.mpladsentinel.audit;

import java.util.List;

/**
 * Body of {@code GET /api/audit/{workId}/photos}.
 *
 * @param photos     the evidence images, newest first (empty when the
 *                   integration is not configured or the call failed)
 * @param configured {@code false} when no {@code PINATA_JWT} is set — the
 *                   frontend shows a "connect Pinata to see evidence" note
 *                   instead of an error
 */
public record AuditEvidenceResponse(List<AuditPhoto> photos, boolean configured) {

    /** One evidence image: the IPFS CID, its Pinata filename, and a viewable gateway URL. */
    public record AuditPhoto(String cid, String name, String url) {
    }
}
