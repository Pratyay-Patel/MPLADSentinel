package com.mpladsentinel;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import com.mpladsentinel.support.AbstractPostgresIntegrationTest;

/**
 * Smoke test: the Spring application context starts with all foundation and
 * data-layer configuration in place (web, security, JPA, and Flyway migrations
 * applied against a real PostgreSQL).
 */
@SpringBootTest
class MpladSentinelApplicationTests extends AbstractPostgresIntegrationTest {

    @Test
    void contextLoads() {
    }
}
