package com.example.backend.controller;

import com.example.backend.dto.response.UploadResponse;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.ImageUploadService;
import com.example.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;
    private final ImageUploadService imageUploadService;
    private final UserService userService;

    public UserController(UserRepository userRepository,
                          ImageUploadService imageUploadService,
                          UserService userService) {
        this.userRepository = userRepository;
        this.imageUploadService = imageUploadService;
        this.userService = userService;
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        User u = userRepository.findByEmail(auth.getName()).orElseThrow();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", u.getId());
        map.put("name", u.getName());
        map.put("email", u.getEmail());
        map.put("role", u.getRole());
        map.put("profileImageUrl", u.getProfileImageUrl());
        return map;
    }

    @PostMapping("/me/photo")
    public ResponseEntity<Map<String, Object>> uploadPhoto(
            Authentication auth,
            @RequestParam("file") MultipartFile file) {
        User u = userRepository.findByEmail(auth.getName()).orElseThrow();
        UploadResponse res = imageUploadService.upload(file, "profile");
        u.setProfileImageUrl(res.url());
        userRepository.save(u);

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", u.getId());
        map.put("name", u.getName());
        map.put("email", u.getEmail());
        map.put("role", u.getRole());
        map.put("profileImageUrl", u.getProfileImageUrl());
        return ResponseEntity.ok(map);
    }

    @DeleteMapping("/me/photo")
    public ResponseEntity<Void> deletePhoto(Authentication auth) {
        User u = userRepository.findByEmail(auth.getName()).orElseThrow();
        u.setProfileImageUrl(null);
        userRepository.save(u);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(Authentication auth) {
        userService.deleteAccount(auth.getName());
        return ResponseEntity.noContent().build();
    }
}