package com.example.backend.controller;

import com.example.backend.dto.request.AppealRequest;
import com.example.backend.dto.request.AppealStatusRequest;
import com.example.backend.dto.response.AppealStatusResponse;
import com.example.backend.service.AppealService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/appeals")
public class AppealController {

    private final AppealService appealService;

    public AppealController(AppealService appealService) {
        this.appealService = appealService;
    }

    @PostMapping
    public ResponseEntity<AppealStatusResponse> submit(@Valid @RequestBody AppealRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(appealService.submit(req));
    }

    // POST isliye ki email/password URL me na aaye (logs me save hote hain)
    @PostMapping("/status")
    public AppealStatusResponse status(@Valid @RequestBody AppealStatusRequest req) {
        return appealService.status(req);
    }
}