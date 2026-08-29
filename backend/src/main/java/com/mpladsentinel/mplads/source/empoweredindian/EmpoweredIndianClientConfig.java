package com.mpladsentinel.mplads.source.empoweredindian;

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
 * Wires the {@link EmpoweredIndianClient} bean: a dedicated {@link RestClient}
 * with the configured base URL and connect/read timeouts, sharing the
 * application's {@link ObjectMapper}.
 *
 * <p>The request factory is chosen by {@link ClientHttpRequestFactoryBuilder#detect()}
 * (JDK {@code HttpClient} unless Apache HttpComponents is on the classpath).
 * Timeouts are applied via {@link ClientHttpRequestFactorySettings} so the client
 * can never hang indefinitely.
 */
@Configuration
@EnableConfigurationProperties(EmpoweredIndianClientProperties.class)
public class EmpoweredIndianClientConfig {

    @Bean
    EmpoweredIndianClient empoweredIndianClient(EmpoweredIndianClientProperties properties,
                                                ObjectMapper objectMapper) {
        ClientHttpRequestFactorySettings settings = ClientHttpRequestFactorySettings.defaults()
                .withConnectTimeout(properties.connectTimeout())
                .withReadTimeout(properties.readTimeout());
        ClientHttpRequestFactory requestFactory = ClientHttpRequestFactoryBuilder.detect().build(settings);

        RestClient restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.USER_AGENT, "MPLADSentinel-Backend/0.0.1-SNAPSHOT")
                .build();

        return new EmpoweredIndianClient(restClient, properties, objectMapper);
    }
}
