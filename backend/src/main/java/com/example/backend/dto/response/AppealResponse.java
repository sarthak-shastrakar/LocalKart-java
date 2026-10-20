package com.example.backend.dto.response;

import java.time.LocalDateTime;

public record AppealResponse(
        Long id, Long userId, String userName, String userEmail, String userRole,
        String message, String status,
        String blockReason, String blockNote, LocalDateTime blockedAt,
        Long blockedById, String blockedByName,
        String adminNote, String reviewedByName,
        LocalDateTime createdAt, LocalDateTime reviewedAt) {
}