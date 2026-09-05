package com.mpladsentinel.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Data access for {@link AppUser} login accounts. */
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmailIgnoreCase(String email);
}
