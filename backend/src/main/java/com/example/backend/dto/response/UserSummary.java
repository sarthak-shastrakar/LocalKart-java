package com.example.backend.dto.response;

import java.time.LocalDateTime;

public record UserSummary(
        Long id, String name, String email, String phone, String role, boolean enabled,
        String blockedReason, String blockedNote, LocalDateTime blockedAt,
        String blockedByName) {
}