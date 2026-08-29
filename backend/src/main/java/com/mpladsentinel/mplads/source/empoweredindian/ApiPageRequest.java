package com.mpladsentinel.mplads.source.empoweredindian;

/**
 * A request for a single page of a paginated Empowered Indian list endpoint
 * ({@code /works/recommended}, {@code /works/completed}).
 *
 * <p>Bounds come from the verified contract (docs/data-source.md &sect;13.2):
 * {@code page} is 1-based and {@code limit} is 1..100 &mdash; the API rejects
 * {@code page=0} and {@code limit=0}/{@code limit>100} with HTTP 400. Validating
 * here means those never reach the network.
 *
 * <p>This is deliberately a <em>single-page</em> abstraction. There is no
 * "fetch everything" loop in this phase; iterating pages to cover the full
 * dataset is the ingestion phase's responsibility.
 */
public record ApiPageRequest(int page, int limit) {

    /** Minimum {@code limit} accepted by the API. */
    public static final int MIN_LIMIT = 1;

    /** Maximum {@code limit} accepted by the API. */
    public static final int MAX_LIMIT = 100;

    public ApiPageRequest {
        if (page < 1) {
            throw new IllegalArgumentException("page must be >= 1, got " + page);
        }
        if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
            throw new IllegalArgumentException(
                    "limit must be between " + MIN_LIMIT + " and " + MAX_LIMIT + ", got " + limit);
        }
    }

    /** A specific page at a specific size. */
    public static ApiPageRequest of(int page, int limit) {
        return new ApiPageRequest(page, limit);
    }

    /** The first page at the given size. */
    public static ApiPageRequest firstPage(int limit) {
        return new ApiPageRequest(1, limit);
    }
}
