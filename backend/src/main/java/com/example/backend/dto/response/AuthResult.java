package com.example.backend.dto.response;

// service se controller tak: body + cookie ki details
public record AuthResult(AuthResponse response, String refreshToken, long refreshMaxAgeSeconds) {
}