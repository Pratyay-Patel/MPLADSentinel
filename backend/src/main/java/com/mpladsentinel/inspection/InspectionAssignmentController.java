package com.mpladsentinel.inspection;

import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
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
import com.mpladsentinel.common.web.ApiErrorResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * Inspection-assignment API (see {@code docs/inspections-audit-feature.md}).
 * Access is enforced in {@code SecurityConfig}:
 * <ul>
 *   <li>{@code GET} — any government role;</li>
 *   <li>{@code POST} / {@code PATCH} — {@code MOSPI} / {@code STATE} / {@code DISTRICT} only.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/assignments")
public class InspectionAssignmentController {

    private final InspectionAssignmentService service;

    public InspectionAssignmentController(InspectionAssignmentService service) {
        this.service = service;
    }

    @GetMapping
    public List<AssignmentResponse> list(
            @RequestParam(required = false) AssignmentStatus status,
            @RequestParam(required = false) String officerCode,
            @RequestParam(required = false) Long sourceWorkId) {
        return service.list(status, officerCode, sourceWorkId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssignmentResponse> get(@PathVariable long id) {
        return service.get(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AssignmentResponse create(@Valid @RequestBody CreateAssignmentRequest request,
                                     @AuthenticationPrincipal AppUserDetails principal) {
        return service.create(request, principal.id());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<AssignmentResponse> update(@PathVariable long id,
                                                     @Valid @RequestBody UpdateAssignmentRequest request) {
        return service.update(id, request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** An open assignment already exists for this work + officer. */
    @ExceptionHandler(OpenAssignmentExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiErrorResponse handleOpenAssignmentExists(OpenAssignmentExistsException ex,
                                                       HttpServletRequest request) {
        return new ApiErrorResponse(Instant.now(), HttpStatus.CONFLICT.value(),
                HttpStatus.CONFLICT.getReasonPhrase(), ex.getMessage(), request.getRequestURI());
    }
}
