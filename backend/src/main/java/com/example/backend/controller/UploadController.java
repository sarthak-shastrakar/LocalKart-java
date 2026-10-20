package com.example.backend.controller;

import com.example.backend.dto.response.UploadResponse;
import com.example.backend.exception.ApiException;
import com.example.backend.service.ImageUploadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/uploads")
public class UploadController {

    private final ImageUploadService imageUploadService;

    public UploadController(ImageUploadService imageUploadService) {
        this.imageUploadService = imageUploadService;
    }

    @PostMapping("/image")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<UploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type) {
        if (!"product".equals(type) && !"store".equals(type)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "type must be 'product' or 'store'");
        }
        return ResponseEntity.ok(imageUploadService.upload(file, type));
    }
}
