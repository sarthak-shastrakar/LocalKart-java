package com.example.backend.controller;

import com.example.backend.dto.request.BlockRequest;
import com.example.backend.dto.response.PageResponse;
import com.example.backend.dto.response.UserSummary;
import com.example.backend.model.Role;
import com.example.backend.service.AdminUserService;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService service;

    public AdminUserController(AdminUserService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<UserSummary> list(@RequestParam(required = false) Role role,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return service.list(role, q, page, size);
    }

    @PatchMapping("/{id}/block")
    public UserSummary block(Authentication auth, @PathVariable Long id,
            @Valid @RequestBody(required = false) BlockRequest req) {
        return service.block(auth.getName(), id, req);
    }

    @PatchMapping("/{id}/unblock")
    public UserSummary unblock(Authentication auth, @PathVariable Long id) {
        return service.unblock(auth.getName(), id);
    }
}