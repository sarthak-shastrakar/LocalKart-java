package com.example.backend.dto.response;

import java.time.LocalDateTime;

public record AppealStatusResponse(
        Long id, String status, String adminNote,
        LocalDateTime createdAt, LocalDateTime reviewedAt,
        LocalDateTime canAppealAgainAt) {
}