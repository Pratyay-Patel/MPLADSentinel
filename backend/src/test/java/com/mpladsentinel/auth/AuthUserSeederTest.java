package com.mpladsentinel.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashSet;
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
 * that seeding creates exactly one account per {@link WebRole}, is idempotent,
 * and honours the disable flag.
 */
@ExtendWith(MockitoExtension.class)
class AuthUserSeederTest {

    @Mock
    private AppUserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private AuthUserSeeder seeder(boolean seedingEnabled) {
        return new AuthUserSeeder(userRepository, passwordEncoder,
                new AuthProperties(seedingEnabled, "Demo@12345"));
    }

    @Test
    void seedsOneAccountPerWebRoleWhenNoneExist() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode("Demo@12345")).thenReturn("$2a$10$hash");

        seeder(true).run(new DefaultApplicationArguments());

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository, times(WebRole.values().length)).save(saved.capture());

        Set<WebRole> rolesSeeded = new HashSet<>();
        for (AppUser user : saved.getAllValues()) {
            rolesSeeded.add(user.getRole());
            assertThat(user.getPasswordHash()).isEqualTo("$2a$10$hash");
            assertThat(user.getPasswordHash()).isNotEqualTo("Demo@12345"); // never plaintext
        }
        assertThat(rolesSeeded).containsExactlyInAnyOrder(WebRole.values());
    }

    @Test
    void isIdempotentWhenAccountsAlreadyExist() {
        when(userRepository.existsByUsername(anyString())).thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$hash");

        seeder(true).run(new DefaultApplicationArguments());

        verify(userRepository, never()).save(any());
    }

    @Test
    void doesNothingWhenSeedingDisabled() {
        seeder(false).run(new DefaultApplicationArguments());

        verify(userRepository, never()).existsByUsername(anyString());
        verify(userRepository, never()).save(any());
    }
}
