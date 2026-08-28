package com.mpladsentinel.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Base class for tests that need a real PostgreSQL instance.
 *
 * <p>A single {@code postgres:16-alpine} container (matching {@code docker-compose.yml}
 * and decision D25) is started once per JVM and shared by every test class that
 * extends this one. Flyway migrates the schema into it on context start, exactly
 * as in a real environment.
 *
 * <p>Requires a working Docker environment. If Docker is unavailable the
 * extending tests fail to start their container &mdash; that is reported as a
 * failure, never silently skipped.
 */
public abstract class AbstractPostgresIntegrationTest {

    @SuppressWarnings("resource")
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
                    .withDatabaseName("mpladsentinel_test")
                    .withUsername("mpladsentinel")
                    .withPassword("test");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
