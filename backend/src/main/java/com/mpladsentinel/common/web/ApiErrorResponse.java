package com.mpladsentinel.common.web;

import java.time.Instant;

/**
 * Consistent error body returned by the API for handled failures.
 *
 * @param timestamp when the error was produced
 * @param status    HTTP status code
 * @param error     short HTTP reason phrase
 * @param message   human-readable, non-sensitive description
 * @param path      request path that produced the error
 */
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path
) {
}
