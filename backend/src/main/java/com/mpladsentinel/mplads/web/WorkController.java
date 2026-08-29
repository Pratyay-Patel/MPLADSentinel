package com.mpladsentinel.mplads.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authority-facing read APIs over the ingested MPLADS works.
 *
 * <p>Access is restricted to the government roles in {@code SecurityConfig}
 * ({@code MOSPI / STATE / DISTRICT / AUDITOR / MP}); the Citizen Portal uses the
 * limited {@link PublicWorkController} instead. Read-only — ingestion is the
 * only writer.
 */
@RestController
@RequestMapping("/api/works")
public class WorkController {

    private final WorkQueryService queryService;

    public WorkController(WorkQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public List<WorkResponse> list() {
        return queryService.listWorks();
    }

    @GetMapping("/summary")
    public WorkSummaryResponse summary() {
        return queryService.summary();
    }

    @GetMapping("/{sourceWorkId}")
    public ResponseEntity<WorkResponse> get(@PathVariable long sourceWorkId) {
        return queryService.getWork(sourceWorkId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{sourceWorkId}/payments")
    public ResponseEntity<List<WorkPaymentResponse>> payments(@PathVariable long sourceWorkId) {
        return queryService.getPayments(sourceWorkId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
