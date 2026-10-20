package com.example.backend.controller;

import com.example.backend.dto.request.AppealDecisionRequest;
import com.example.backend.dto.response.AppealResponse;
import com.example.backend.dto.response.PageResponse;
import com.example.backend.model.AppealStatus;
import com.example.backend.service.AppealService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/appeals")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAppealController {

    private final AppealService appealService;

    public AdminAppealController(AppealService appealService) {
        this.appealService = appealService;
    }

    // mine=true -> "Assigned to me" tab, mine=false -> "All appeals" tab
    @GetMapping
    public PageResponse<AppealResponse> list(Authentication auth,
            @RequestParam(defaultValue = "PENDING") AppealStatus status,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return appealService.list(auth.getName(), status, mine, page, size);
    }

    // tab badges ke liye: { "mine": 2, "all": 5 }
    @GetMapping("/pending-count")
    public Map<String, Long> pendingCount(Authentication auth) {
        return appealService.pendingCounts(auth.getName());
    }

    @PatchMapping("/{id}/approve")
    public AppealResponse approve(Authentication auth, @PathVariable Long id,
            @Valid @RequestBody(required = false) AppealDecisionRequest req) {
        return appealService.approve(auth.getName(), id, req == null ? null : req.getNote());
    }

    @PatchMapping("/{id}/reject")
    public AppealResponse reject(Authentication auth, @PathVariable Long id,
            @Valid @RequestBody AppealDecisionRequest req) {
        return appealService.reject(auth.getName(), id, req.getNote());
    }
}