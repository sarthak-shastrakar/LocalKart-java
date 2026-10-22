package com.example.backend.controller;

import com.example.backend.security.RefreshCookieFactory;
import com.example.backend.service.AuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me/sessions")
public class SessionController {

    private final AuthService authService;
    private final RefreshCookieFactory cookies;

    public SessionController(AuthService authService, RefreshCookieFactory cookies) {
        this.authService = authService;
        this.cookies = cookies;
    }

    @DeleteMapping
    public ResponseEntity<Void> logoutAll(Authentication auth) {
        authService.logoutAll(auth.getName());
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clear().toString())
                .build();
    }
}