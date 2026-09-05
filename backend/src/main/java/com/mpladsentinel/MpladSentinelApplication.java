package com.mpladsentinel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the MPLADSentinel backend.
 *
 * <p>MPLADSentinel is built as a Spring Boot <em>modular monolith</em>: business
 * capabilities live in sibling packages under {@code com.mpladsentinel} (for
 * example {@code auth}, {@code mplads}, {@code risk}, {@code audit}), each with
 * its own controller / service / repository layers, while sharing a single
 * deployable application and datasource. Cross-cutting concerns live in
 * {@code com.mpladsentinel.config} and {@code com.mpladsentinel.common}.
 *
 * <p>Authentication (decision D31) is backed by a real
 * {@link com.mpladsentinel.auth.AppUserDetailsService} over seeded
 * {@code app_user} rows, so Spring Security's default in-memory user
 * auto-configuration stays out of the way on its own — no exclusion needed.
 */
@SpringBootApplication
public class MpladSentinelApplication {

    public static void main(String[] args) {
        SpringApplication.run(MpladSentinelApplication.class, args);
    }
}
