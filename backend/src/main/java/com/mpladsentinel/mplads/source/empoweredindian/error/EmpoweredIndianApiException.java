package com.mpladsentinel.mplads.source.empoweredindian.error;

/**
 * The API returned an HTTP response the client cannot treat as success:
 * a validation error (400), an unexpected 404, a 5xx, a 429, etc.
 *
 * <p>The Empowered Indian error model is inconsistent across situations
 * (docs/data-source.md &sect;13.5); the raw body is captured (bounded) rather
 * than parsed into a fixed shape.
 */
public class EmpoweredIndianApiException extends EmpoweredIndianClientException {

    private final int statusCode;
    private final String responseBodySnippet;

    public EmpoweredIndianApiException(int statusCode, String responseBodySnippet, String message) {
        super(message + " (HTTP " + statusCode + ", body: " + responseBodySnippet + ")");
        this.statusCode = statusCode;
        this.responseBodySnippet = responseBodySnippet;
    }

    /** The HTTP status code returned by the API. */
    public int statusCode() {
        return statusCode;
    }

    /** The response body, trimmed to {@code maxErrorBodyChars}. Never null. */
    public String responseBodySnippet() {
        return responseBodySnippet;
    }
}
