package com.mpladsentinel.config;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpladsentinel.common.web.ApiErrorResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Spring Security configuration.
 *
 * <p><strong>Round 1 authentication (decision D31).</strong> Deliberately
 * minimal, but real:
 * <ul>
 *   <li>a stateful {@code HttpSession} holds the security context — no JWT;</li>
 *   <li>credentials are checked against seeded {@code app_user} rows
 *       ({@code AppUserDetailsService}) with BCrypt hashing;</li>
 *   <li>every endpoint requires authentication except {@code POST /api/auth/login},
 *       {@code GET /api/health} and the actuator health/info probes;</li>
 *   <li>{@code GET /api/works/**} additionally requires a government role
 *       (MoSPI / State / District / Auditor / MP); the Citizen Portal reads the
 *       limited {@code /api/public/works} instead;</li>
 *   <li>unauthenticated calls get a JSON {@link ApiErrorResponse} 401 and
 *       forbidden calls a JSON 403 — never a redirect or HTML error page;</li>
 *   <li>configurable CORS with credentials for the SPA dev origin.</li>
 * </ul>
 *
 * <p><strong>Deliberately out of Round 1 scope</strong> (documented limitations,
 * not oversights): CSRF tokens are disabled — the SPA session cookie is
 * {@code SameSite=Lax} and the API is called cross-origin only from the
 * allow-listed dev origin; session-fixation rotation on login is not performed.
 * Both are revisited before any production deployment.
 *
 * <p>Further per-endpoint authority rules (matching the frontend {@code canAccess}
 * map) are added alongside each business API as it is built (grievances, …).
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
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            AuthenticationEntryPoint restAuthenticationEntryPoint,
                                            AccessDeniedHandler restAccessDeniedHandler)
            throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // CSRF intentionally disabled for Round 1 — see class Javadoc.
                .csrf(csrf -> csrf.disable())
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                // Logout is handled explicitly by AuthController (session.invalidate()).
                .logout(logout -> logout.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(restAuthenticationEntryPoint)
                        .accessDeniedHandler(restAccessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        // Public: login + citizen self-registration + operational probes.
                        // /register is unthrottled for Round 1 (documented limitation, D32).
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        // Authority-facing work APIs: government roles only. The
                        // Citizen Portal uses /api/public/works, which just
                        // needs a signed-in session (matched by anyRequest).
                        .requestMatchers(HttpMethod.GET, "/api/works", "/api/works/**")
                        .hasAnyRole("MOSPI", "STATE", "DISTRICT", "AUDITOR", "MP")
                        // Grievances: a citizen raises one; MoSPI/State/District
                        // act on it; anyone signed in may read (the service scopes
                        // a citizen to their own).
                        .requestMatchers(HttpMethod.POST, "/api/grievances").hasRole("CITIZEN")
                        .requestMatchers(HttpMethod.PATCH, "/api/grievances/**")
                        .hasAnyRole("MOSPI", "STATE", "DISTRICT")
                        // Work recommendations: a citizen proposes one; MoSPI/State/District
                        // act on it; anyone signed in may read (the service scopes a
                        // citizen to their own) — same shape as grievances.
                        .requestMatchers(HttpMethod.POST, "/api/recommendations").hasRole("CITIZEN")
                        .requestMatchers(HttpMethod.PATCH, "/api/recommendations/**")
                        .hasAnyRole("MOSPI", "STATE", "DISTRICT")
                        // Inspection assignments: MoSPI/State/District create and
                        // advance them; any government role reads. FIELD_OFFICER
                        // has no authority-facing endpoints and is excluded here.
                        .requestMatchers(HttpMethod.POST, "/api/assignments")
                        .hasAnyRole("MOSPI", "STATE", "DISTRICT")
                        .requestMatchers(HttpMethod.PATCH, "/api/assignments/**")
                        .hasAnyRole("MOSPI", "STATE", "DISTRICT")
                        // Dual-authority sign-off (completing/cancelling requires a second,
                        // different authority to confirm) — same role set as PATCH; the
                        // "different user" check itself is enforced in the service layer.
                        .requestMatchers(HttpMethod.POST,
                                "/api/assignments/*/sign-off/request", "/api/assignments/*/sign-off/confirm")
                        .hasAnyRole("MOSPI", "STATE", "DISTRICT")
                        .requestMatchers(HttpMethod.GET,
                                "/api/assignments", "/api/assignments/**", "/api/officers")
                        .hasAnyRole("MOSPI", "STATE", "DISTRICT", "AUDITOR", "MP")
                        // Audit Trail evidence (Pinata-backed) — any government role.
                        .requestMatchers(HttpMethod.GET, "/api/audit/**")
                        .hasAnyRole("MOSPI", "STATE", "DISTRICT", "AUDITOR", "MP")
                        // Notifications: any signed-in role reads/marks their own (matched
                        // by anyRequest below); only the roles that see the Dashboard /
                        // Risk & Alerts pages may send an attention notice.
                        .requestMatchers(HttpMethod.POST, "/api/notifications/send-notice")
                        .hasAnyRole("MOSPI", "STATE", "DISTRICT", "AUDITOR", "MP")
                        // Everything else requires a signed-in session.
                        .anyRequest().authenticated());

        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
            throws Exception {
        return configuration.getAuthenticationManager();
    }

    /** Returns the standard {@link ApiErrorResponse} body with a 401 for unauthenticated calls. */
    @Bean
    AuthenticationEntryPoint restAuthenticationEntryPoint(ObjectMapper objectMapper) {
        return (request, response, authException) ->
                writeError(objectMapper, request, response, HttpStatus.UNAUTHORIZED,
                        "Authentication required.");
    }

    /** Returns the standard {@link ApiErrorResponse} body with a 403 when the role is not permitted. */
    @Bean
    AccessDeniedHandler restAccessDeniedHandler(ObjectMapper objectMapper) {
        return (request, response, accessDeniedException) ->
                writeError(objectMapper, request, response, HttpStatus.FORBIDDEN,
                        "You do not have access to this resource.");
    }

    private static void writeError(ObjectMapper objectMapper,
                                   HttpServletRequest request,
                                   HttpServletResponse response,
                                   HttpStatus status,
                                   String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), new ApiErrorResponse(
                Instant.now(), status.value(), status.getReasonPhrase(), message,
                request.getRequestURI()));
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
