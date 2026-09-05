package com.mpladsentinel.mplads.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mpladsentinel.common.web.PageResponse;
import com.mpladsentinel.common.web.PaginationRequest;

/**
 * Publicly releasable read APIs over the ingested MPLADS works, used by the
 * Citizen Portal. Any authenticated user may call these; the response
 * ({@link PublicWorkResponse}) carries only fields that are safe to show to the
 * public — no risk data, data-quality flags, payment internals or provenance.
 */
@RestController
@RequestMapping("/api/public/works")
public class PublicWorkController {

    private final WorkQueryService queryService;

    public PublicWorkController(WorkQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public PageResponse<PublicWorkResponse> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return queryService.listPublicWorks(PaginationRequest.of(page, size));
    }

    @GetMapping("/{reference}")
    public ResponseEntity<PublicWorkResponse> get(@PathVariable long reference) {
        return queryService.getPublicWork(reference)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
