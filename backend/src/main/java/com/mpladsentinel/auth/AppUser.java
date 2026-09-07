package com.mpladsentinel.auth;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A web-portal login account. Maps {@code app_user} (migration V5).
 *
 * <p>Round 1 holds only seeded demo accounts (decision D31). The stored
 * {@link #passwordHash} is always a BCrypt hash — never a plaintext or
 * reversible value.
 */
@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 256)
    private String username;

    /** Login email for self-registered citizens (then {@code username == email}); {@code null} for seeded accounts. */
    @Column(unique = true, length = 256)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private WebRole role;

    @Column(name = "display_name", length = 128)
    private String displayName;

    /** Stable field-officer id used by the Flutter app (e.g. {@code OFF102}); {@code null} for every non-field-officer account. */
    @Column(name = "officer_code", unique = true, length = 16)
    private String officerCode;

    /** Field-officer contact number; {@code null} for every non-field-officer account. */
    @Column(length = 32)
    private String phone;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected AppUser() {
    }

    public AppUser(String username, String passwordHash, WebRole role, String displayName) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.displayName = displayName;
    }

    /** Field-officer account: carries the wire {@code officerCode} and a contact number. */
    public static AppUser fieldOfficer(String username, String passwordHash, String displayName,
                                       String officerCode, String phone) {
        AppUser user = new AppUser(username, passwordHash, WebRole.FIELD_OFFICER, displayName);
        user.officerCode = officerCode;
        user.phone = phone;
        return user;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public WebRole getRole() {
        return role;
    }

    public void setRole(WebRole role) {
        this.role = role;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getOfficerCode() {
        return officerCode;
    }

    public void setOfficerCode(String officerCode) {
        this.officerCode = officerCode;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
