package com.example.backend.controller;

import com.example.backend.dto.response.StoreResponse;
import com.example.backend.model.StoreStatus;
import com.example.backend.service.StoreService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/stores")
@PreAuthorize("hasRole('ADMIN')")
public class AdminStoreController {

    private final StoreService storeService;

    public AdminStoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    @GetMapping
    public List<StoreResponse> list(@RequestParam(defaultValue = "PENDING") StoreStatus status) {
        return storeService.listByStatus(status);
    }

    @PatchMapping("/{id}/approve")
    public StoreResponse approve(@PathVariable Long id) {
        return storeService.changeStatus(id, StoreStatus.APPROVED);
    }

    @PatchMapping("/{id}/reject")
    public StoreResponse reject(@PathVariable Long id) {
        return storeService.changeStatus(id, StoreStatus.REJECTED);
    }
}