package com.mpladsentinel.mplads.source.empoweredindian.error;

/**
 * A response was received with a 2xx status, but its body does not match the
 * verified contract: it is not JSON, {@code success} is not {@code true}, the
 * {@code data} object is missing, a field cannot be mapped, or the body exceeds
 * the client's safety size limit.
 *
 * <p>Not retried &mdash; repeating an identical request will not change a
 * malformed body.
 */
public class EmpoweredIndianResponseException extends EmpoweredIndianClientException {

    public EmpoweredIndianResponseException(String message) {
        super(message);
    }

    public EmpoweredIndianResponseException(String message, Throwable cause) {
        super(message, cause);
    }
}
