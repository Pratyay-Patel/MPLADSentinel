package com.mpladsentinel.common.web;

import java.util.List;

/** Standard response envelope for paginated collection APIs. */
import java.util.List;

/** Standard response envelope for paginated collection APIs. */
public final class PageResponse {
    public static <T> List<T> of(List<T> allRows, int page, int size) {
        long requestedFrom = (long) (page - 1) * size;
        int from = (int) Math.min(requestedFrom, allRows.size());
        int to = Math.min(from + size, allRows.size());
        return List.copyOf(allRows.subList(from, to));
    }
}
