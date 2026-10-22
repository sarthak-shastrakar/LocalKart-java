package com.example.backend.service;

import com.example.backend.dto.request.LoginRequest;
import com.example.backend.dto.request.RegisterRequest;
import com.example.backend.dto.response.AuthResponse;
import com.example.backend.dto.response.AuthResult;
import com.example.backend.exception.ApiException;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.backend.security.LoginAttemptService;
import org.springframework.security.authentication.BadCredentialsException;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final LoginAttemptService loginAttempts;

    public AuthService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            LoginAttemptService loginAttempts) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.loginAttempts = loginAttempts;
    }

    @Transactional
    public AuthResult register(RegisterRequest req) {
        if (req.getRole() == Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cannot register as ADMIN");
        }
        String email = req.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }
        User user = new User();
        user.setName(req.getName().trim());
        user.setEmail(email);
        user.setPhone(req.getPhone());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRole(req.getRole());
        userRepository.save(user);
        return issueFor(user);
    }

    @Transactional
    public AuthResult login(LoginRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        loginAttempts.checkNotLocked(email);
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, req.getPassword()));
        } catch (BadCredentialsException e) {
            loginAttempts.recordFailure(email);
            throw e;
        }
        loginAttempts.recordSuccess(email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        return issueFor(user);
    }

    // outer transaction pe bhi noRollbackFor, warna reuse-revoke rollback ho jayega
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResult refresh(String rawRefreshToken) {
        RefreshTokenService.Rotated r = refreshTokenService.rotate(rawRefreshToken);
        return result(r.user(), r.issued());
    }

    public void logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    @Transactional
    public void logoutAll(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        refreshTokenService.revokeAll(user.getId());
    }

    // ---------- helpers ----------
    private AuthResult issueFor(User user) {
        return result(user, refreshTokenService.issue(user));
    }

    private AuthResult result(User user, RefreshTokenService.Issued issued) {
        long maxAge = Math.max(
                Duration.between(LocalDateTime.now(), issued.expiresAt()).getSeconds(), 0);
        return new AuthResult(toResponse(user), issued.token(), maxAge);
    }

    private AuthResponse toResponse(User user) {
        return new AuthResponse(jwtService.generateToken(user), "Bearer",
                user.getId(), user.getName(), user.getEmail(), user.getRole().name());
    }
}