package com.mpladsentinel.inspection;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.mpladsentinel.auth.AppUser;
import com.mpladsentinel.auth.AppUserRepository;
import com.mpladsentinel.auth.AuthProperties;
import com.mpladsentinel.auth.WebRole;

/**
 * Creates the demo field-officer accounts at application startup (decision D34) —
 * the officers an authority can assign an inspection to. Idempotent: a missing
 * account is created; an existing one keeps its credentials but has its display
 * name / phone refreshed to the current values.
 *
 * <p>Mirrors {@link com.mpladsentinel.auth.AuthUserSeeder} and shares its gate —
 * {@code mplads.auth.seeding-enabled} — and its {@code mplads.auth.seed-password}
 * (the two seeders touch disjoint accounts, so their order does not matter). The
 * codes / names line up with the mobile team's {@code docs/MOBILE_ARCHITECTURE.md}
 * so both apps match during integration testing. Clearly demo data (CLAUDE.md §8).
 */
@Component
class FieldOfficerSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FieldOfficerSeeder.class);

    /** officerCode, display name, phone. username is the lowercased officer code. */
    private static final List<SeedOfficer> OFFICERS = List.of(
            new SeedOfficer("OFF101", "Amit Patil", "+91 98200 10101"),
            new SeedOfficer("OFF102", "Rahul Sharma", "+91 98200 10102"),
            new SeedOfficer("OFF103", "Priya Deshmukh", "+91 98200 10103"),
            new SeedOfficer("OFF104", "Sneha Iyer", "+91 98200 10104"),
            new SeedOfficer("OFF105", "Vikram Rao", "+91 98200 10105"));

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties authProperties;

    FieldOfficerSeeder(AppUserRepository userRepository,
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
            log.info("Auth user seeding disabled; skipping field-officer seed.");
            return;
        }

        String hash = passwordEncoder.encode(authProperties.seedPassword());
        int created = 0;
        int refreshed = 0;
        for (SeedOfficer officer : OFFICERS) {
            AppUser existing = userRepository.findByOfficerCode(officer.code()).orElse(null);
            if (existing != null) {
                if (!officer.name().equals(existing.getDisplayName())
                        || !officer.phone().equals(existing.getPhone())) {
                    existing.setDisplayName(officer.name());
                    existing.setPhone(officer.phone());
                    userRepository.save(existing);
                    refreshed++;
                    log.info("Refreshed field-officer account '{}'", officer.code());
                }
                continue;
            }
            userRepository.save(AppUser.fieldOfficer(
                    officer.code().toLowerCase(), hash, officer.name(), officer.code(), officer.phone()));
            created++;
            log.info("Seeded field-officer account '{}' ({})", officer.code(), officer.name());
        }
        if (created == 0 && refreshed == 0) {
            log.info("Field-officer accounts already present; nothing to seed.");
        }
    }

    private record SeedOfficer(String code, String name, String phone) {
    }
}
