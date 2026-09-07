package com.mpladsentinel.audit;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.core.JacksonException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Read-only transport client for the Pinata Files API
 * ({@code GET /v3/files/{network}}). Fetches the most recently uploaded files
 * for the account behind the configured JWT, newest first.
 *
 * <p>Framework-free (constructed by {@link PinataConfig}) so it can be
 * unit-tested against a local mock HTTP server. Every failure — transport,
 * non-2xx, or an unparseable body — is surfaced as {@link PinataException}.
 */
public class PinataClient {

    /** Upper bound on the response body this client will buffer. */
    static final int MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

    private static final Logger log = LoggerFactory.getLogger(PinataClient.class);

    private final RestClient restClient;
    private final PinataProperties properties;
    private final ObjectMapper objectMapper;

    public PinataClient(RestClient restClient, PinataProperties properties, ObjectMapper objectMapper) {
        this.restClient = Objects.requireNonNull(restClient, "restClient");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
    }

    /**
     * The {@code limit} most recent uploads, ordered by Pinata's creation time
     * descending (newest first). Ordering is Pinata's — EXIF is never consulted.
     *
     * @throws PinataException on any transport / HTTP / parse failure
     */
    public List<PinataFile> fetchLatestFiles(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        try {
            return restClient.get()
                    .uri(builder -> builder.path("/v3/files/{network}")
                            .queryParam("order", "DESC")
                            .queryParam("limit", safeLimit)
                            .build(properties.network()))
                    .accept(MediaType.APPLICATION_JSON)
                    .exchange((request, response) -> {
                        HttpStatusCode status = response.getStatusCode();
                        String body = readBody(response);
                        if (status.isError()) {
                            throw new PinataException("Pinata GET /v3/files failed: HTTP "
                                    + status.value() + " " + snippet(body));
                        }
                        return parseFiles(body);
                    });
        } catch (ResourceAccessException e) {
            throw new PinataException("Transport failure calling Pinata: " + e.getMessage(), e);
        }
    }

    private String readBody(ClientHttpResponse response) {
        try (InputStream in = response.getBody()) {
            byte[] bytes = in.readNBytes(MAX_RESPONSE_BYTES + 1);
            if (bytes.length > MAX_RESPONSE_BYTES) {
                throw new PinataException("Pinata response body exceeded the "
                        + MAX_RESPONSE_BYTES + "-byte limit");
            }
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new PinataException("I/O error reading the Pinata response body", e);
        }
    }

    private List<PinataFile> parseFiles(String body) {
        JsonNode root;
        try {
            root = objectMapper.readTree(body);
        } catch (JacksonException e) {
            throw new PinataException("Pinata returned an unparseable body: " + snippet(body), e);
        }
        // v3 shape: { "data": { "files": [ { "cid", "name", "created_at" }, ... ] } }
        JsonNode files = root.path("data").path("files");
        if (!files.isArray()) {
            files = root.path("files");
        }
        if (!files.isArray()) {
            throw new PinataException("Pinata response had no 'data.files' array: " + snippet(body));
        }

        List<PinataFile> out = new ArrayList<>();
        for (JsonNode file : files) {
            String cid = text(file, "cid");
            if (cid == null || cid.isBlank()) {
                log.warn("Skipping a Pinata file with no cid: {}", snippet(file.toString()));
                continue;
            }
            out.add(new PinataFile(cid, text(file, "name"), text(file, "created_at")));
        }
        return out;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private static String snippet(String body) {
        if (body == null) {
            return "";
        }
        String trimmed = body.strip();
        return trimmed.length() <= 500 ? trimmed : trimmed.substring(0, 500) + "...(truncated)";
    }
}
