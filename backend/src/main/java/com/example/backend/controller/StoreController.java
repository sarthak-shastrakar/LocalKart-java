package com.example.backend.controller;

import com.example.backend.dto.request.StoreRequest;
import com.example.backend.dto.response.StoreResponse;
import com.example.backend.service.StoreService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stores")
public class StoreController {

    private final StoreService storeService;

    public StoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    // ---- store owner ----
    @PostMapping
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<StoreResponse> create(Authentication auth,
            @Valid @RequestBody StoreRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(storeService.create(auth.getName(), req));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public StoreResponse myStore(Authentication auth) {
        return storeService.getMyStore(auth.getName());
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public StoreResponse update(Authentication auth, @Valid @RequestBody StoreRequest req) {
        return storeService.updateMyStore(auth.getName(), req);
    }

    @PatchMapping("/me/open")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public StoreResponse toggleOpen(Authentication auth, @RequestParam boolean value) {
        return storeService.setOpen(auth.getName(), value);
    }

    // ---- public (customers) ----
    @GetMapping("/nearby")
    public List<StoreResponse> nearby(@RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5") double radius) {
        return storeService.nearby(lat, lng, radius);
    }

    @GetMapping("/{id}")
    public StoreResponse getById(@PathVariable Long id) {
        return storeService.getApprovedById(id);
    }
}