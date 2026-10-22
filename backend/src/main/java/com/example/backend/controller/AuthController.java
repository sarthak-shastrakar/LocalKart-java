package com.example.backend.controller;

import com.example.backend.dto.request.LoginRequest;
import com.example.backend.dto.request.RegisterRequest;
import com.example.backend.dto.response.AuthResponse;
import com.example.backend.dto.response.AuthResult;
import com.example.backend.security.RefreshCookieFactory;
import com.example.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshCookieFactory cookies;

    public AuthController(AuthService authService, RefreshCookieFactory cookies) {
        this.authService = authService;
        this.cookies = cookies;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return respond(HttpStatus.CREATED, authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return respond(HttpStatus.OK, authService.login(req));
    }

    // cookie nahi hai (visitor logged out hai) -> 204, cookie galat/expired -> 401
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = RefreshCookieFactory.NAME, required = false) String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.noContent().build();
        }
        return respond(HttpStatus.OK, authService.refresh(token));
    }

    // access token expire ho chuka ho tab bhi logout chalta hai
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = RefreshCookieFactory.NAME, required = false) String token) {
        authService.logout(token);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clear().toString())
                .build();
    }

    private ResponseEntity<AuthResponse> respond(HttpStatus status, AuthResult r) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE,
                        cookies.create(r.refreshToken(), r.refreshMaxAgeSeconds()).toString())
                .body(r.response());
    }
}