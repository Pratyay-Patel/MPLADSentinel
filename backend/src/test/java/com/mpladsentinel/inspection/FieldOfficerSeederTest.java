package com.mpladsentinel.inspection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.mpladsentinel.auth.AppUser;
import com.mpladsentinel.auth.AppUserRepository;
import com.mpladsentinel.auth.AuthProperties;
import com.mpladsentinel.auth.WebRole;

/**
 * Unit tests for {@link FieldOfficerSeeder} — no Spring context, no database.
 */
@ExtendWith(MockitoExtension.class)
class FieldOfficerSeederTest {

    private static final int EXPECTED_OFFICERS = 5;

    @Mock
    private AppUserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private FieldOfficerSeeder seeder(boolean seedingEnabled) {
        return new FieldOfficerSeeder(userRepository, passwordEncoder,
                new AuthProperties(seedingEnabled, "Demo@12345"));
    }

    @Test
    void seedsEveryDemoFieldOfficerWhenNoneExist() {
        when(userRepository.findByOfficerCode(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Demo@12345")).thenReturn("$2a$10$hash");

        seeder(true).run(new DefaultApplicationArguments());

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository, times(EXPECTED_OFFICERS)).save(saved.capture());

        for (AppUser officer : saved.getAllValues()) {
            assertThat(officer.getRole()).isEqualTo(WebRole.FIELD_OFFICER);
            assertThat(officer.getOfficerCode()).startsWith("OFF10");
            assertThat(officer.getUsername()).isEqualTo(officer.getOfficerCode().toLowerCase());
            assertThat(officer.getPhone()).isNotBlank();
            assertThat(officer.getPasswordHash()).isEqualTo("$2a$10$hash");
            assertThat(officer.getPasswordHash()).isNotEqualTo("Demo@12345"); // never plaintext
        }
        assertThat(saved.getAllValues()).extracting(AppUser::getOfficerCode)
                .containsExactlyInAnyOrder("OFF101", "OFF102", "OFF103", "OFF104", "OFF105");
    }

    @Test
    void isIdempotentWhenOfficersAlreadyExistUnchanged() {
        when(userRepository.findByOfficerCode(anyString())).thenAnswer(invocation -> {
            String code = invocation.getArgument(0);
            AppUser existing = switch (code) {
                case "OFF101" -> AppUser.fieldOfficer("off101", "$2a$10$hash", "Amit Patil", "OFF101", "+91 98200 10101");
                case "OFF102" -> AppUser.fieldOfficer("off102", "$2a$10$hash", "Rahul Sharma", "OFF102", "+91 98200 10102");
                case "OFF103" -> AppUser.fieldOfficer("off103", "$2a$10$hash", "Priya Deshmukh", "OFF103", "+91 98200 10103");
                case "OFF104" -> AppUser.fieldOfficer("off104", "$2a$10$hash", "Sneha Iyer", "OFF104", "+91 98200 10104");
                case "OFF105" -> AppUser.fieldOfficer("off105", "$2a$10$hash", "Vikram Rao", "OFF105", "+91 98200 10105");
                default -> null;
            };
            return Optional.ofNullable(existing);
        });
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$hash");

        seeder(true).run(new DefaultApplicationArguments());

        verify(userRepository, never()).save(any());
    }

    @Test
    void refreshesNameAndPhoneWhenTheyDrift() {
        when(userRepository.findByOfficerCode(anyString())).thenAnswer(invocation -> {
            String code = invocation.getArgument(0);
            if ("OFF101".equals(code)) {
                return Optional.of(AppUser.fieldOfficer(
                        "off101", "$2a$10$hash", "Old Name", "OFF101", "+91 00000 00000"));
            }
            // the rest are already current
            AppUser current = switch (code) {
                case "OFF102" -> AppUser.fieldOfficer("off102", "$2a$10$hash", "Rahul Sharma", "OFF102", "+91 98200 10102");
                case "OFF103" -> AppUser.fieldOfficer("off103", "$2a$10$hash", "Priya Deshmukh", "OFF103", "+91 98200 10103");
                case "OFF104" -> AppUser.fieldOfficer("off104", "$2a$10$hash", "Sneha Iyer", "OFF104", "+91 98200 10104");
                case "OFF105" -> AppUser.fieldOfficer("off105", "$2a$10$hash", "Vikram Rao", "OFF105", "+91 98200 10105");
                default -> null;
            };
            return Optional.ofNullable(current);
        });
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$hash");

        seeder(true).run(new DefaultApplicationArguments());

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository, times(1)).save(saved.capture());
        assertThat(saved.getValue().getDisplayName()).isEqualTo("Amit Patil");
        assertThat(saved.getValue().getPhone()).isEqualTo("+91 98200 10101");
    }

    @Test
    void doesNothingWhenSeedingDisabled() {
        seeder(false).run(new DefaultApplicationArguments());

        verify(userRepository, never()).findByOfficerCode(anyString());
        verify(userRepository, never()).save(any());
    }
}
