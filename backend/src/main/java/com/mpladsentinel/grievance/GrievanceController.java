package com.mpladsentinel.grievance;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mpladsentinel.auth.AppUserDetails;
import com.mpladsentinel.auth.WebRole;
import com.mpladsentinel.common.web.PageResponse;
import com.mpladsentinel.common.web.PaginationRequest;

import jakarta.validation.Valid;

/**
 * Grievance API (round1-scope P1.5). Access is enforced in {@code SecurityConfig}:
 * <ul>
 *   <li>{@code GET} — any signed-in role; a citizen sees only their own,
 *       everyone else sees all;</li>
 *   <li>{@code POST} — CITIZEN only (government roles cannot raise grievances);</li>
 *   <li>{@code PATCH} — MoSPI / State / District only.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/grievances")
public class GrievanceController {

    private final GrievanceService service;

    public GrievanceController(GrievanceService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<GrievanceResponse> list(
            @AuthenticationPrincipal AppUserDetails principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        PaginationRequest pagination = PaginationRequest.of(page, size);
        return principal.role() == WebRole.CITIZEN
                ? service.listOwnedBy(principal.id(), pagination)
                : service.listAll(pagination);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GrievanceResponse create(@Valid @RequestBody CreateGrievanceRequest request,
                                    @AuthenticationPrincipal AppUserDetails principal) {
        return service.create(request, principal.id());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<GrievanceResponse> updateStatus(
            @PathVariable long id,
            @Valid @RequestBody UpdateGrievanceStatusRequest request) {
        return service.updateStatus(id, request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
