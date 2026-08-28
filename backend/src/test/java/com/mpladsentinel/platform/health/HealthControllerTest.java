package com.mpladsentinel.platform.health;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.mpladsentinel.platform.health.HealthController.HealthResponse;
import com.mpladsentinel.support.AbstractPostgresIntegrationTest;

/**
 * Verifies that {@code GET /api/health} is reachable through the full HTTP and
 * security filter chain and returns the expected payload.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthControllerTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void healthEndpointReturnsUp() {
        ResponseEntity<HealthResponse> response =
                restTemplate.getForEntity("/api/health", HealthResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo("UP");
        assertThat(response.getBody().service()).isEqualTo("mpladsentinel-backend");
        assertThat(response.getBody().timestamp()).isNotNull();
    }
}
