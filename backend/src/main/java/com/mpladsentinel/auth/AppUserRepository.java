package com.mpladsentinel.auth;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Data access for {@link AppUser} login accounts. */
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmailIgnoreCase(String email);

    /** One field-officer account by its wire id (e.g. {@code OFF102}). */
    Optional<AppUser> findByOfficerCode(String officerCode);

    /** Accounts with the given role, ordered for a stable dropdown. */
    List<AppUser> findByRoleOrderByOfficerCodeAsc(WebRole role);
}
