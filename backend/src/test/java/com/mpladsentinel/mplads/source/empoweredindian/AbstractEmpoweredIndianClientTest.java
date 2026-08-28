package com.mpladsentinel.mplads.source.empoweredindian;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import okhttp3.mockwebserver.MockWebServer;

/**
 * Base for {@link EmpoweredIndianClient} tests. Starts a local {@link MockWebServer}
 * so every test exercises the real HTTP stack, the real request factory, and real
 * Jackson deserialisation &mdash; none of these tests touch the live Empowered
 * Indian service.
 */
abstract class AbstractEmpoweredIndianClientTest {

    protected MockWebServer server;
    protected ObjectMapper objectMapper;

    @BeforeEach
    void startServer() throws IOException {
        server = new MockWebServer();
        server.start();
        objectMapper = JsonMapper.builder().addModule(new JavaTimeModule()).build();
    }

    @AfterEach
    void stopServer() throws IOException {
        server.shutdown();
    }

    /** Fast defaults: 3 attempts, 1 ms retry delay, generous timeouts. */
    protected EmpoweredIndianClientProperties defaultProperties() {
        return properties(Duration.ofSeconds(2), Duration.ofSeconds(2), 3, Duration.ofMillis(1));
    }

    protected EmpoweredIndianClientProperties properties(Duration connectTimeout,
                                                        Duration readTimeout,
                                                        int maxAttempts,
                                                        Duration retryDelay) {
        return new EmpoweredIndianClientProperties(
                server.url("/api").toString(),
                connectTimeout,
                readTimeout,
                maxAttempts,
                retryDelay,
                20,
                2000);
    }

    protected EmpoweredIndianClient clientWith(EmpoweredIndianClientProperties properties) {
        ClientHttpRequestFactorySettings settings = ClientHttpRequestFactorySettings.defaults()
                .withConnectTimeout(properties.connectTimeout())
                .withReadTimeout(properties.readTimeout());
        ClientHttpRequestFactory factory = ClientHttpRequestFactoryBuilder.detect().build(settings);

        RestClient restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(factory)
                .build();

        return new EmpoweredIndianClient(restClient, properties, objectMapper);
    }

    protected EmpoweredIndianClient defaultClient() {
        return clientWith(defaultProperties());
    }

    protected String fixture(String name) {
        try {
            return StreamUtils.copyToString(
                    new ClassPathResource("empoweredindian/" + name).getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Missing test fixture: empoweredindian/" + name, e);
        }
    }
}
