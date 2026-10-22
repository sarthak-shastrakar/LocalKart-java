package com.example.backend.service;

import com.example.backend.exception.ApiException;
import com.example.backend.model.RefreshToken;
import com.example.backend.model.User;
import com.example.backend.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class RefreshTokenService {

    // do tabs ek saath refresh karein to dusre ko "reuse attack" na samjho
    private static final int GRACE_SECONDS = 10;

    public record Issued(String token, LocalDateTime expiresAt) {
    }

    public record Rotated(User user, Issued issued) {
    }

    private final RefreshTokenRepository repository;
    private final long refreshExpiryMs;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repository,
            @Value("${app.jwt.refresh-expiry-ms}") long refreshExpiryMs) {
        this.repository = repository;
        this.refreshExpiryMs = refreshExpiryMs;
    }

    // naya login: 24 ghante ka naya session
    @Transactional
    public Issued issue(User user) {
        return create(user, LocalDateTime.now().plus(Duration.ofMillis(refreshExpiryMs)));
    }

    // noRollbackFor zaroori hai: reuse pakadne par revoke-all commit hona chahiye,
    // exception ke saath rollback nahi
    @Transactional(noRollbackFor = ApiException.class)
    public Rotated rotate(String raw) {
        if (raw == null || raw.isBlank())
            throw unauthorized();

        RefreshToken t = repository.findByHashForUpdate(hash(raw)).orElseThrow(this::unauthorized);
        LocalDateTime now = LocalDateTime.now();
        Long userId = t.getUser().getId();

        if (t.isRevoked()) {
            boolean recent = t.getRevokedAt() != null
                    && t.getRevokedAt().isAfter(now.minusSeconds(GRACE_SECONDS));
            if (!recent) {
                repository.revokeAllForUser(userId, now); // token chori ho sakta hai
            }
            throw unauthorized();
        }
        if (t.getExpiresAt().isBefore(now)) {
            throw unauthorized();
        }

        User user = t.getUser();
        if (!user.isEnabled()) {
            repository.revokeAllForUser(userId, now);
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account has been blocked.");
        }

        t.setRevoked(true);
        t.setRevokedAt(now);
        repository.save(t);

        // naya token, lekin session ki purani (absolute) expiry ke saath
        return new Rotated(user, create(user, t.getExpiresAt()));
    }

    @Transactional
    public void revoke(String raw) {
        if (raw == null || raw.isBlank())
            return;
        repository.findByTokenHash(hash(raw)).ifPresent(t -> {
            if (!t.isRevoked()) {
                t.setRevoked(true);
                t.setRevokedAt(LocalDateTime.now());
                repository.save(t);
            }
        });
    }

    @Transactional
    public void revokeAll(Long userId) {
        repository.revokeAllForUser(userId, LocalDateTime.now());
    }

    // roz raat 3 baje purane rows hata do
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanup() {
        repository.deleteExpired(LocalDateTime.now().minusDays(1));
    }

    // ---------- helpers ----------
    private Issued create(User user, LocalDateTime expiresAt) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken t = new RefreshToken();
        t.setUser(user);
        t.setTokenHash(hash(raw));
        t.setExpiresAt(expiresAt);
        repository.save(t);
        return new Issued(raw, expiresAt);
    }

    private String hash(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "Session expired. Please log in again.");
    }
}