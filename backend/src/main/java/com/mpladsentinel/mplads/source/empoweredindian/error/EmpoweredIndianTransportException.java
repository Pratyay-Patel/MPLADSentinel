package com.mpladsentinel.mplads.source.empoweredindian.error;

/**
 * The call did not complete at the transport level: connect timeout, read
 * timeout, DNS failure, connection reset, or an I/O error while reading the body.
 * No usable HTTP response was obtained.
 */
public class EmpoweredIndianTransportException extends EmpoweredIndianClientException {

    public EmpoweredIndianTransportException(String message, Throwable cause) {
        super(message, cause);
    }
}
