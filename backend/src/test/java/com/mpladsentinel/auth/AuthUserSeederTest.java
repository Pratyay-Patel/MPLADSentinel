package com.mpladsentinel.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Unit tests for {@link AuthUserSeeder} — no Spring context, no database. Covers
 * that seeding creates exactly one account per authority / citizen {@link WebRole}
 * (every role except {@link WebRole#FIELD_OFFICER}, which is seeded elsewhere), is
 * idempotent, and honours the disable flag.
 */
@ExtendWith(MockitoExtension.class)
class AuthUserSeederTest {

    /** Roles {@link AuthUserSeeder} is responsible for — all of them bar FIELD_OFFICER. */
    private static final WebRole[] PORTAL_LOGIN_ROLES = Arrays.stream(WebRole.values())
            .filter(role -> role != WebRole.FIELD_OFFICER)
            .toArray(WebRole[]::new);

    /** username -> the display name the seeder assigns it (mirrors {@code AuthUserSeeder.ACCOUNTS}). */
    private static final Map<String, String> SEED_DISPLAY_NAMES = Map.of(
            "mospi", "MoSPI / Ministry",
            "state", "State Authority",
            "district", "District Authority",
            "auditor", "Auditor",
            "mp", "Member of Parliament",
            "citizen", "Citizen");

    @Mock
    private AppUserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private AuthUserSeeder seeder(boolean seedingEnabled) {
        return new AuthUserSeeder(userRepository, passwordEncoder,
                new AuthProperties(seedingEnabled, "Demo@12345"));
    }

    @Test
    void seedsOneAccountPerPortalLoginRoleWhenNoneExist() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Demo@12345")).thenReturn("$2a$10$hash");

        seeder(true).run(new DefaultApplicationArguments());

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository, times(PORTAL_LOGIN_ROLES.length)).save(saved.capture());

        Set<WebRole> rolesSeeded = new HashSet<>();
        for (AppUser user : saved.getAllValues()) {
            rolesSeeded.add(user.getRole());
            assertThat(user.getPasswordHash()).isEqualTo("$2a$10$hash");
            assertThat(user.getPasswordHash()).isNotEqualTo("Demo@12345"); // never plaintext
        }
        assertThat(rolesSeeded).containsExactlyInAnyOrder(PORTAL_LOGIN_ROLES);
    }

    @Test
    void isIdempotentWhenAccountsAlreadyExistWithCurrentLabels() {
        // Every seed username already resolves to an account whose display name is
        // already current -> no create, no label refresh.
        when(userRepository.findByUsername(anyString())).thenAnswer(invocation -> {
            String username = invocation.getArgument(0);
            String displayName = SEED_DISPLAY_NAMES.get(username);
            if (displayName == null) {
                return Optional.empty();
            }
            AppUser existing = new AppUser(username, "$2a$10$hash", WebRole.CITIZEN, displayName);
            return Optional.of(existing);
        });
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$hash");

        seeder(true).run(new DefaultApplicationArguments());

        verify(userRepository, never()).save(any());
    }

    @Test
    void doesNothingWhenSeedingDisabled() {
        seeder(false).run(new DefaultApplicationArguments());

        verify(userRepository, never()).findByUsername(anyString());
        verify(userRepository, never()).save(any());
    }
}
