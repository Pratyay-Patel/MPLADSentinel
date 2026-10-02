package com.mpladsentinel.escrow;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mpladsentinel.auth.AppUserDetails;
import com.mpladsentinel.auth.WebRole;
import com.mpladsentinel.common.web.ApiErrorResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * Escrow & Fund Control API. Access is enforced in {@code SecurityConfig}:
 * <ul>
 *   <li>{@code GET} — DISTRICT or MOSPI only; a District Officer sees only
 *       their own requests, MoSPI sees all;</li>
 *   <li>{@code POST /api/fund-requests} — DISTRICT only;</li>
 *   <li>{@code POST /api/fund-requests/{id}/release-notice} — MOSPI only.</li>
 * </ul>
 * Only these two roles are involved in this feature, per the feature spec.
 */
@RestController
@RequestMapping("/api/fund-requests")
public class FundRequestController {

    private final FundRequestService service;

    public FundRequestController(FundRequestService service) {
        this.service = service;
    }

    @GetMapping
    public List<FundRequestResponse> list(@AuthenticationPrincipal AppUserDetails principal) {
        return principal.role() == WebRole.DISTRICT
                ? service.listOwnedBy(principal.id())
                : service.listAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<FundRequestResponse> get(@PathVariable long id,
                                                   @AuthenticationPrincipal AppUserDetails principal) {
        Optional<FundRequestResponse> found = service.get(id);
        if (found.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FundRequestResponse response = found.get();
        // A District Officer may only open their own requests -- 404, not 403,
        // so the existence of someone else's request isn't leaked.
        if (principal.role() == WebRole.DISTRICT
                && !principal.getUsername().equals(response.requestedByUsername())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FundRequestResponse create(@Valid @RequestBody CreateFundRequestRequest request,
                                      @AuthenticationPrincipal AppUserDetails principal) {
        return service.create(request, principal.id());
    }

    /**
     * MoSPI records that the bank has been notified to release an approved
     * installment. Database bookkeeping only — see {@link FundRequestService#sendReleaseNotice}.
     */
    @PostMapping("/{id}/release-notice")
    public ResponseEntity<FundRequestResponse> sendReleaseNotice(@PathVariable long id,
                                                                 @AuthenticationPrincipal AppUserDetails principal) {
        return service.sendReleaseNotice(id, principal.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** The request isn't APPROVED, or its release notice was already sent. */
    @ExceptionHandler(ReleaseNoticeException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiErrorResponse handleReleaseNoticeConflict(ReleaseNoticeException ex, HttpServletRequest request) {
        return new ApiErrorResponse(Instant.now(), HttpStatus.CONFLICT.value(),
                HttpStatus.CONFLICT.getReasonPhrase(), ex.getMessage(), request.getRequestURI());
    }
}
