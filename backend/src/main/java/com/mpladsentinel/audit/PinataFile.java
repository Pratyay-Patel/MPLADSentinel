package com.mpladsentinel.audit;

/**
 * One file as returned by the Pinata Files API
 * ({@code GET /v3/files/{network}}). Transport model — only the fields the
 * Audit Trail needs. {@code createdAt} is Pinata's upload/creation timestamp,
 * kept verbatim as a string (the Audit page renders a date only).
 */
public record PinataFile(String cid, String name, String createdAt) {
}
