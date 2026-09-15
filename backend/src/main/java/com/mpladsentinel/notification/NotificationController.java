package com.mpladsentinel.notification;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mpladsentinel.auth.AppUserDetails;

import jakarta.validation.Valid;

/**
 * Notification API (header bell + "Send Notice"). Access is enforced in
 * {@code SecurityConfig}:
 * <ul>
 *   <li>{@code GET} / mark-read / mark-all-read / clear — any signed-in role,
 *       scoped to their own notifications;</li>
 *   <li>{@code POST /send-notice} — MoSPI / State / District / Auditor / MP only
 *       (the same roles that see the Dashboard / Risk &amp; Alerts pages).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<NotificationResponse> list(@AuthenticationPrincipal AppUserDetails principal) {
        return service.listFor(principal.id(), principal.role());
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(
            @PathVariable long id, @AuthenticationPrincipal AppUserDetails principal) {
        return service.markRead(id, principal.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/mark-all-read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(@AuthenticationPrincipal AppUserDetails principal) {
        service.markAllRead(principal.id());
    }

    @PostMapping("/clear")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clear(@AuthenticationPrincipal AppUserDetails principal) {
        service.clearAll(principal.id());
    }

    @PostMapping("/send-notice")
    @ResponseStatus(HttpStatus.CREATED)
    public NotificationResponse sendNotice(@Valid @RequestBody SendNoticeRequest request) {
        return service.sendSlaNotice(request);
    }
}
