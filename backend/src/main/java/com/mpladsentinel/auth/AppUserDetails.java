package com.mpladsentinel.auth;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Spring Security principal backed by an {@link AppUser} row. Carries the web
 * {@link #role()} and {@link #displayName()} so the auth endpoints can answer
 * "who am I" without a second database read.
 */
public final class AppUserDetails implements UserDetails {

    private final String username;
    private final String passwordHash;
    private final WebRole role;
    private final String displayName;
    private final boolean enabled;

    public AppUserDetails(AppUser user) {
        this.username = user.getUsername();
        this.passwordHash = user.getPasswordHash();
        this.role = user.getRole();
        this.displayName = user.getDisplayName();
        this.enabled = user.isEnabled();
    }

    public WebRole role() {
        return role;
    }

    public String displayName() {
        return displayName;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.authority()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
