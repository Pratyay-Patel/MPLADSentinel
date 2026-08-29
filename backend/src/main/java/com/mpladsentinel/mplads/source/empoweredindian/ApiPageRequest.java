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
 * <p>{@code state} is an optional exact-match filter on the record's
 * {@code state} value (docs/data-source.md &sect;13.2/&sect;13.3 &mdash; VERIFIED
 * on both endpoints; Title Case, appears case-sensitive). {@code null} or blank
 * means "no state filter".
 *
 * <p>This is deliberately a <em>single-page</em> abstraction. There is no
 * "fetch everything" loop in this phase; iterating pages to cover the full
 * dataset is the ingestion phase's responsibility.
 */
public record ApiPageRequest(int page, int limit, String state) {

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
        if (state != null && state.isBlank()) {
            state = null;
        }
    }

    /** A specific page at a specific size, with no state filter. */
    public static ApiPageRequest of(int page, int limit) {
        return new ApiPageRequest(page, limit, null);
    }

    /** A specific page at a specific size, filtered to one state ({@code null}/blank = no filter). */
    public static ApiPageRequest of(int page, int limit, String state) {
        return new ApiPageRequest(page, limit, state);
    }

    /** The first page at the given size, with no state filter. */
    public static ApiPageRequest firstPage(int limit) {
        return new ApiPageRequest(1, limit, null);
    }

    /** Whether a state filter is set. */
    public boolean hasState() {
        return state != null;
    }
}
