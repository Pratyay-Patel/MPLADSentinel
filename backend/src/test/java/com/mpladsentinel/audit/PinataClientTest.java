package com.mpladsentinel.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;

/**
 * {@link PinataClient} tests against a local {@link MockWebServer} — real HTTP
 * stack, real Jackson, no live Pinata call.
 */
class PinataClientTest {

    private MockWebServer server;
    private ObjectMapper objectMapper;

    @BeforeEach
    void start() throws IOException {
        server = new MockWebServer();
        server.start();
        objectMapper = JsonMapper.builder().build();
    }

    @AfterEach
    void stop() throws IOException {
        server.shutdown();
    }

    private PinataClient client() {
        PinataProperties properties = new PinataProperties(
                "test-jwt", server.url("/").toString(), "public",
                "https://gateway.pinata.cloud/ipfs/",
                Duration.ofSeconds(2), Duration.ofSeconds(2), 2);
        ClientHttpRequestFactorySettings settings = ClientHttpRequestFactorySettings.defaults()
                .withConnectTimeout(properties.connectTimeout())
                .withReadTimeout(properties.readTimeout());
        ClientHttpRequestFactory factory = ClientHttpRequestFactoryBuilder.detect().build(settings);
        RestClient restClient = RestClient.builder()
                .baseUrl(properties.apiBaseUrl())
                .requestFactory(factory)
                .build();
        return new PinataClient(restClient, properties, objectMapper);
    }

    @Test
    void mapsFilesNewestFirstAndRequestsDescLimit() throws InterruptedException {
        server.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        { "data": { "files": [
                          { "id": "1", "cid": "bafyLatest", "name": "site-2.jpg", "created_at": "2026-09-04T10:00:00Z" },
                          { "id": "2", "cid": "bafyOlder",  "name": "site-1.jpg", "created_at": "2026-09-04T09:55:00Z" }
                        ], "next_page_token": null } }
                        """));

        List<PinataFile> files = client().fetchLatestFiles(2);

        assertThat(files).hasSize(2);
        assertThat(files.get(0).cid()).isEqualTo("bafyLatest");
        assertThat(files.get(0).name()).isEqualTo("site-2.jpg");
        assertThat(files.get(0).createdAt()).isEqualTo("2026-09-04T10:00:00Z");

        RecordedRequest request = server.takeRequest();
        assertThat(request.getPath()).startsWith("/v3/files/public");
        assertThat(request.getPath()).contains("order=DESC").contains("limit=2");
        assertThat(request.getHeader("Authorization")).isNull(); // added by PinataConfig, not the client
    }

    @Test
    void skipsAFileWithoutACid() {
        server.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        { "data": { "files": [
                          { "id": "1", "name": "no-cid.jpg" },
                          { "id": "2", "cid": "bafyGood", "name": "good.jpg" }
                        ] } }
                        """));

        assertThat(client().fetchLatestFiles(2))
                .singleElement()
                .extracting(PinataFile::cid).isEqualTo("bafyGood");
    }

    @Test
    void throwsPinataExceptionOnUnauthorized() {
        server.enqueue(new MockResponse().setResponseCode(401).setBody("{\"error\":\"invalid token\"}"));

        assertThatThrownBy(() -> client().fetchLatestFiles(2))
                .isInstanceOf(PinataException.class)
                .hasMessageContaining("401");
    }

    @Test
    void throwsPinataExceptionOnMalformedBody() {
        server.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("not json at all"));

        assertThatThrownBy(() -> client().fetchLatestFiles(2))
                .isInstanceOf(PinataException.class);
    }

    @Test
    void throwsPinataExceptionWhenFilesArrayMissing() {
        server.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("{ \"data\": { \"next_page_token\": null } }"));

        assertThatThrownBy(() -> client().fetchLatestFiles(2))
                .isInstanceOf(PinataException.class)
                .hasMessageContaining("data.files");
    }
}
