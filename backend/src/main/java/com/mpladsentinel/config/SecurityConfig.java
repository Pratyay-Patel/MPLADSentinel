package com.mpladsentinel.config;

import java.util.List;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Baseline Spring Security configuration.
 *
 * <p><strong>Project Foundation scope.</strong> This class establishes the
 * security <em>structure</em> only:
 * <ul>
 *   <li>stateless session handling (no server-side HTTP session),</li>
 *   <li>CSRF disabled — appropriate for a token-based REST API,</li>
 *   <li>form login and HTTP Basic disabled — no interactive browser login,</li>
 *   <li>configurable CORS for the frontend dev origin.</li>
 * </ul>
 *
 * <p>It intentionally does <strong>not</strong> implement authentication or
 * role-based authorization. There is deliberately no user store and no default
 * login — endpoints are currently open so the foundation can be built and
 * verified without a fake auth mechanism. Real authentication and
 * backend-enforced RBAC (roles: MP, District Authority, State Authority,
 * MoSPI / Ministry, Auditor, Citizen, Field Officer) are added in the dedicated
 * RBAC implementation phase, at which point the {@code anyRequest} rule below
 * becomes {@code authenticated()} and per-endpoint authority checks are added.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(SecurityProperties.class)
public class SecurityConfig {

    private final SecurityProperties securityProperties;

    public SecurityConfig(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Operational endpoints are always reachable.
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        // Foundation phase: no auth layer yet. Tightened to
                        // .authenticated() in the RBAC phase.
                        .anyRequest().permitAll());

        return http.build();
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(securityProperties.corsAllowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
