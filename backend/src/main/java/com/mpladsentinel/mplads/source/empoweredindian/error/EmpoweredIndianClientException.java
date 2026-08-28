package com.mpladsentinel.mplads.source.empoweredindian.error;

/**
 * Base type for every failure raised by the Empowered Indian client.
 *
 * <p>Concrete subtypes distinguish the failure mode so callers (the future
 * ingestion service) can react appropriately &mdash; e.g. map a transport failure
 * to a retryable run outcome, and a malformed response to a dead-letter.
 */
public abstract class EmpoweredIndianClientException extends RuntimeException {

    protected EmpoweredIndianClientException(String message) {
        super(message);
    }

    protected EmpoweredIndianClientException(String message, Throwable cause) {
        super(message, cause);
    }
}
