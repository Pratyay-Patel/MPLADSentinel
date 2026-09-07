package com.mpladsentinel.audit;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Wires the {@link PinataClient} bean: a dedicated {@link RestClient} with the
 * Pinata API base URL, connect/read timeouts, and — only when a JWT is
 * configured — a {@code Bearer} authorization header. The JWT is read from
 * {@link PinataProperties} (env {@code PINATA_JWT}) and never logged.
 */
@Configuration
@EnableConfigurationProperties(PinataProperties.class)
public class PinataConfig {

    @Bean
    PinataClient pinataClient(PinataProperties properties, ObjectMapper objectMapper) {
        ClientHttpRequestFactorySettings settings = ClientHttpRequestFactorySettings.defaults()
                .withConnectTimeout(properties.connectTimeout())
                .withReadTimeout(properties.readTimeout());
        ClientHttpRequestFactory requestFactory = ClientHttpRequestFactoryBuilder.detect().build(settings);

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(properties.apiBaseUrl())
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.USER_AGENT, "MPLADSentinel-Backend/0.0.1-SNAPSHOT");
        if (properties.configured()) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.jwt());
        }
        return new PinataClient(builder.build(), properties, objectMapper);
    }
}
