package com.mpladsentinel.common.web;

/** Validated one-based pagination parameters received by collection APIs. */
public record PaginationRequest(int page, int size) {

    public static PaginationRequest of(int page, int size) {
        if (page < 1) {
            throw new IllegalArgumentException("page must be at least 1");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("size must be between 1 and 100");
        }
        return new PaginationRequest(page, size);
    }
}
