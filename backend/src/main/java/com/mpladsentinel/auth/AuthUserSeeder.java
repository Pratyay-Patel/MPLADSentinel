package com.mpladsentinel.auth;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the Round 1 demo login accounts at application startup — one per
 * authority / citizen web role (decision D31). Idempotent: a missing account is
 * created; an existing one keeps its credentials but has its display name
 * refreshed to the current label, so this is safe to run on every boot.
 *
 * <p>{@link WebRole#FIELD_OFFICER} is deliberately not seeded here — field
 * officers are a set of individually-coded accounts provisioned by
 * {@code inspection.FieldOfficerSeeder} (D34).
 *
 * <p>Runs only when {@code mplads.auth.seeding-enabled} is {@code true} (the
 * default). Production-like environments that provision their own accounts, and
 * tests that manage their own fixtures, set it to {@code false}.
 *
 * <p>All accounts share {@code mplads.auth.seed-password}; it is BCrypt-hashed
 * here and never stored in plaintext.
 */
@Component
class AuthUserSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AuthUserSeeder.class);

    /** username, role, human-readable label. Usernames are lowercase role keys. */
    private static final List<SeedAccount> ACCOUNTS = List.of(
            new SeedAccount("mospi", WebRole.MOSPI, "MoSPI / Ministry"),
            new SeedAccount("state", WebRole.STATE, "State Authority"),
            new SeedAccount("district", WebRole.DISTRICT, "District Authority"),
            new SeedAccount("auditor", WebRole.AUDITOR, "Auditor"),
            new SeedAccount("mp", WebRole.MP, "Member of Parliament"),
            new SeedAccount("citizen", WebRole.CITIZEN, "Citizen"));

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties authProperties;

    AuthUserSeeder(AppUserRepository userRepository,
                   PasswordEncoder passwordEncoder,
                   AuthProperties authProperties) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authProperties = authProperties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!authProperties.seedingEnabled()) {
            log.info("Auth user seeding disabled (mplads.auth.seeding-enabled=false); skipping.");
            return;
        }

        String hash = passwordEncoder.encode(authProperties.seedPassword());
        int created = 0;
        int refreshed = 0;
        for (SeedAccount account : ACCOUNTS) {
            AppUser existing = userRepository.findByUsername(account.username()).orElse(null);
            if (existing != null) {
                if (!account.displayName().equals(existing.getDisplayName())) {
                    existing.setDisplayName(account.displayName());
                    userRepository.save(existing);
                    refreshed++;
                    log.info("Refreshed display name for login account '{}'", account.username());
                }
                continue;
            }
            userRepository.save(new AppUser(
                    account.username(), hash, account.role(), account.displayName()));
            created++;
            log.info("Seeded demo login account '{}' ({})", account.username(), account.role());
        }
        if (created == 0 && refreshed == 0) {
            log.info("Demo login accounts already present; nothing to seed.");
        }
    }

    private record SeedAccount(String username, WebRole role, String displayName) {
    }
}
