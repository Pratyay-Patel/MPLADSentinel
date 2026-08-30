package com.mpladsentinel.auth;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registration for citizen self-service accounts (decision D32). Government
 * accounts are seeded ({@link AuthUserSeeder}); this path only ever creates a
 * {@link WebRole#CITIZEN}.
 */
@Service
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AppUserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Create a new citizen account. The username is the (lower-cased) email.
     *
     * @throws IllegalArgumentException        if the passwords do not match
     * @throws EmailAlreadyRegisteredException if the email is already in use
     */
    @Transactional
    public AppUser register(RegisterRequest request) {
        if (!request.password().equals(request.passwordConfirm())) {
            throw new IllegalArgumentException("The passwords do not match.");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email) || users.existsByUsername(email)) {
            throw new EmailAlreadyRegisteredException();
        }

        AppUser user = new AppUser(
                email,
                passwordEncoder.encode(request.password()),
                WebRole.CITIZEN,                 // never taken from the request
                request.displayName().trim());
        user.setEmail(email);
        return users.save(user);
    }
}
