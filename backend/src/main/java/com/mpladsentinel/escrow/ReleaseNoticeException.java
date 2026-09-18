package com.mpladsentinel.escrow;

/**
 * Thrown when "Send Release Notice to Bank" is invalid: the request is not
 * {@link FundRequestStatus#APPROVED}, or its release notice has already been
 * sent. Surfaced as HTTP {@code 409 Conflict}.
 */
public class ReleaseNoticeException extends RuntimeException {

    public ReleaseNoticeException(String message) {
        super(message);
    }
}
