package com.mpladsentinel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * Entry point for the MPLADSentinel backend.
 *
 * <p>MPLADSentinel is built as a Spring Boot <em>modular monolith</em>: business
 * capabilities live in sibling packages under {@code com.mpladsentinel} (for
 * example {@code project}, {@code risk}, {@code ingestion}, {@code audit}), each
 * with its own controller / service / repository layers, while sharing a single
 * deployable application and datasource. Cross-cutting concerns live in
 * {@code com.mpladsentinel.config} and {@code com.mpladsentinel.common}.
 *
 * <p>{@link UserDetailsServiceAutoConfiguration} is excluded so that Spring
 * Security does not create a default in-memory user with a generated password.
 * The Project Foundation phase deliberately ships no authentication. A real
 * {@code UserDetailsService} is added in the RBAC phase, at which point this
 * exclusion is removed.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class MpladSentinelApplication {

    public static void main(String[] args) {
        SpringApplication.run(MpladSentinelApplication.class, args);
    }
}
