package com.example.backend.controller;

import com.example.backend.dto.response.UploadResponse;
import com.example.backend.exception.ApiException;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.RefreshCookieFactory;
import com.example.backend.service.AccountService;
import com.example.backend.service.ImageUploadService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;
    private final ImageUploadService imageUploadService;
    private final AccountService accountService;
    private final RefreshCookieFactory cookies;

    public UserController(UserRepository userRepository,
            ImageUploadService imageUploadService,
            AccountService accountService,
            RefreshCookieFactory cookies) {
        this.userRepository = userRepository;
        this.imageUploadService = imageUploadService;
        this.accountService = accountService;
        this.cookies = cookies;
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        return toMap(current(auth));
    }

    @PostMapping("/me/photo")
    public ResponseEntity<Map<String, Object>> uploadPhoto(
            Authentication auth,
            @RequestParam("file") MultipartFile file) {
        User u = current(auth);
        UploadResponse res = imageUploadService.upload(file, "profile");
        String oldUrl = u.getProfileImageUrl();
        u.setProfileImageUrl(res.url());
        userRepository.save(u);
        if (oldUrl != null) {
            imageUploadService.deleteQuietly(List.of(oldUrl)); // purani photo Cloudinary se hatao
        }
        return ResponseEntity.ok(toMap(u));
    }

    @DeleteMapping("/me/photo")
    public ResponseEntity<Void> deletePhoto(Authentication auth) {
        User u = current(auth);
        String oldUrl = u.getProfileImageUrl();
        u.setProfileImageUrl(null);
        userRepository.save(u);
        if (oldUrl != null) {
            imageUploadService.deleteQuietly(List.of(oldUrl));
        }
        return ResponseEntity.noContent().build();
    }

    public static class DeleteAccountRequest {
        @NotBlank
        private String password;

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(Authentication auth,
            @Valid @RequestBody DeleteAccountRequest req) {
        accountService.deleteAccount(auth.getName(), req.getPassword());
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clear().toString())
                .build();
    }

    private User current(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Map<String, Object> toMap(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("name", u.getName());
        m.put("email", u.getEmail());
        m.put("role", u.getRole());
        m.put("profileImageUrl", u.getProfileImageUrl());
        return m;
    }
}