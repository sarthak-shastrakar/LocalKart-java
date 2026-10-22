package com.example.backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class RefreshCookieFactory {

    public static final String NAME = "refresh_token";

    private final boolean secure;
    private final String sameSite;

    public RefreshCookieFactory(@Value("${app.cookie.secure:false}") boolean secure,
            @Value("${app.cookie.same-site:Lax}") String sameSite) {
        this.secure = secure;
        this.sameSite = sameSite;
    }

    public ResponseCookie create(String token, long maxAgeSeconds) {
        return build(token, Math.max(maxAgeSeconds, 0));
    }

    public ResponseCookie clear() {
        return build("", 0);
    }

    // path sirf /api/v1/auth: cookie baaki APIs ke saath jaati hi nahi
    private ResponseCookie build(String value, long maxAge) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/api/v1/auth")
                .maxAge(maxAge)
                .build();
    }
}