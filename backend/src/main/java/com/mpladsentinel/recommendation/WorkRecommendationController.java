package com.mpladsentinel.recommendation;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mpladsentinel.auth.AppUserDetails;
import com.mpladsentinel.auth.WebRole;

import jakarta.validation.Valid;

/**
 * Citizen work-recommendation API (e-SAKSHI-style "recommend a work").
 * Access is enforced in {@code SecurityConfig}:
 * <ul>
 *   <li>{@code GET} — any signed-in role; a citizen sees only their own,
 *       everyone else sees all;</li>
 *   <li>{@code POST} — CITIZEN only (government roles cannot recommend works
 *       on the citizen channel);</li>
 *   <li>{@code PATCH} — MoSPI / State / District only.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/recommendations")
public class WorkRecommendationController {

    private final WorkRecommendationService service;

    public WorkRecommendationController(WorkRecommendationService service) {
        this.service = service;
    }

    @GetMapping
    public List<WorkRecommendationResponse> list(@AuthenticationPrincipal AppUserDetails principal) {
        return principal.role() == WebRole.CITIZEN
                ? service.listOwnedBy(principal.id())
                : service.listAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkRecommendationResponse create(@Valid @RequestBody CreateWorkRecommendationRequest request,
                                             @AuthenticationPrincipal AppUserDetails principal) {
        return service.create(request, principal.id());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<WorkRecommendationResponse> updateStatus(
            @PathVariable long id,
            @Valid @RequestBody UpdateRecommendationStatusRequest request) {
        return service.updateStatus(id, request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
