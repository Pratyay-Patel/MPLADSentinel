package com.mpladsentinel.audit;

/**
 * A call to Pinata failed (transport error, non-2xx response, or an
 * unparseable body). The Audit-evidence service treats this as "no evidence
 * available right now" rather than failing the whole page.
 */
public class PinataException extends RuntimeException {

    public PinataException(String message) {
        super(message);
    }

    public PinataException(String message, Throwable cause) {
        super(message, cause);
    }
}
