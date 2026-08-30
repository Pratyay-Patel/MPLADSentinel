package com.mpladsentinel.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/**
 * Round 1 authentication endpoints (decisions D31, D32).
 *
 * <ul>
 *   <li>{@code POST /api/auth/login} — validate credentials, start a server
 *       session, return the {@link SessionUser}. Public.</li>
 *   <li>{@code POST /api/auth/register} — create a citizen account (role is
 *       always {@code CITIZEN}), sign in, return the {@link SessionUser}. Public.
 *       No email verification / rate-limiting in Round 1 (documented, D32).</li>
 *   <li>{@code GET /api/auth/me} — the current {@link SessionUser}; 401 when not
 *       signed in.</li>
 *   <li>{@code POST /api/auth/logout} — invalidate the session; 204.</li>
 * </ul>
 *
 * <p>Uses a stateful {@code HttpSession} rather than JWT (D31). Session-fixation
 * hardening and CSRF tokens are deliberately out of Round 1 scope — see
 * {@code SecurityConfig}.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final AuthService authService;
    private final SecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();

    public AuthController(AuthenticationManager authenticationManager, AuthService authService) {
        this.authenticationManager = authenticationManager;
        this.authService = authService;
    }

    @PostMapping("/login")
    public SessionUser login(@Valid @RequestBody LoginRequest request,
                             HttpServletRequest httpRequest,
                             HttpServletResponse httpResponse) {
        return startSession(request.username(), request.password(), httpRequest, httpResponse);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionUser register(@Valid @RequestBody RegisterRequest request,
                                HttpServletRequest httpRequest,
                                HttpServletResponse httpResponse) {
        AppUser created = authService.register(request);
        return startSession(created.getUsername(), request.password(), httpRequest, httpResponse);
    }

    @GetMapping("/me")
    public SessionUser me(Authentication authentication) {
        return SessionUser.from(authentication);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    /** Authenticate the credentials and persist the security context to the HTTP session. */
    private SessionUser startSession(String username, String rawPassword,
                                     HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(username, rawPassword));

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        return SessionUser.from(authentication);
    }
}
