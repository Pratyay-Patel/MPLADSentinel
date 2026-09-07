package com.mpladsentinel.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unit tests for {@link AuditEvidenceService}: the not-configured short-circuit,
 * the happy-path CID -> gateway-URL mapping, and graceful degradation when
 * Pinata fails.
 */
@ExtendWith(MockitoExtension.class)
class AuditEvidenceServiceTest {

    @Mock
    private PinataClient pinata;

    private static PinataProperties props(String jwt) {
        return new PinataProperties(jwt, "https://api.pinata.cloud", "public",
                "https://gateway.pinata.cloud/ipfs/",
                Duration.ofSeconds(5), Duration.ofSeconds(10), 2);
    }

    @Test
    void returnsNotConfiguredAndNeverCallsPinataWhenNoJwt() {
        AuditEvidenceService service = new AuditEvidenceService(pinata, props(""));

        AuditEvidenceResponse response = service.forWork(4213908L);

        assertThat(response.configured()).isFalse();
        assertThat(response.photos()).isEmpty();
        verifyNoInteractions(pinata);
    }

    @Test
    void mapsPinataFilesToGatewayUrls() {
        when(pinata.fetchLatestFiles(2)).thenReturn(List.of(
                new PinataFile("bafyA", "site-2.jpg", "2026-09-04T10:00:00Z"),
                new PinataFile("bafyB", "site-1.jpg", null)));
        AuditEvidenceService service = new AuditEvidenceService(pinata, props("real-jwt"));

        AuditEvidenceResponse response = service.forWork(4213908L);

        assertThat(response.configured()).isTrue();
        assertThat(response.photos()).extracting(AuditEvidenceResponse.AuditPhoto::url)
                .containsExactly(
                        "https://gateway.pinata.cloud/ipfs/bafyA",
                        "https://gateway.pinata.cloud/ipfs/bafyB");
        assertThat(response.photos().get(0).name()).isEqualTo("site-2.jpg");
    }

    @Test
    void degradesToConfiguredWithNoPhotosWhenPinataFails() {
        when(pinata.fetchLatestFiles(2)).thenThrow(new PinataException("Pinata GET /v3/files failed: HTTP 500"));
        AuditEvidenceService service = new AuditEvidenceService(pinata, props("real-jwt"));

        AuditEvidenceResponse response = service.forWork(4213908L);

        assertThat(response.configured()).isTrue();
        assertThat(response.photos()).isEmpty();
    }
}
