package com.mpladsentinel.platform.health;

import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lightweight liveness endpoint used by the frontend and by local tooling to
 * confirm the backend is reachable. Operational only — it exposes no MPLADS or
 * business data.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final String applicationName;

    public HealthController(@Value("${spring.application.name:mpladsentinel-backend}") String applicationName) {
        this.applicationName = applicationName;
    }

    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("UP", applicationName, Instant.now());
    }

    /** Response body for {@code GET /api/health}. */
    public record HealthResponse(String status, String service, Instant timestamp) {
    }
}
