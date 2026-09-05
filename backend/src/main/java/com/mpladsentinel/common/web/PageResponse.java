package com.mpladsentinel.common.web;

import java.util.List;

/** Standard response envelope for paginated collection APIs. */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {

    public static <T> PageResponse<T> of(List<T> allRows, int page, int size) {
        long requestedFrom = (long) (page - 1) * size;
        int from = (int) Math.min(requestedFrom, allRows.size());
        int to = Math.min(from + size, allRows.size());
        int totalPages = allRows.isEmpty() ? 0 : (int) Math.ceil((double) allRows.size() / size);
        return new PageResponse<>(List.copyOf(allRows.subList(from, to)), page, size, allRows.size(), totalPages);
    }
}