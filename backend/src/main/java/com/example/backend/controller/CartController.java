package com.example.backend.controller;

import com.example.backend.dto.request.CartItemRequest;
import com.example.backend.dto.response.CartResponse;
import com.example.backend.service.CartService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cart")
@PreAuthorize("hasRole('CUSTOMER')")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public CartResponse get(Authentication auth) {
        return cartService.get(auth.getName());
    }

    @PostMapping("/items")
    public CartResponse add(Authentication auth, @Valid @RequestBody CartItemRequest req) {
        return cartService.addItem(auth.getName(), req);
    }

    @PatchMapping("/items/{productId}")
    public CartResponse setQuantity(Authentication auth, @PathVariable Long productId,
            @RequestParam int quantity) {
        return cartService.setQuantity(auth.getName(), productId, quantity);
    }

    @DeleteMapping("/items/{productId}")
    public CartResponse remove(Authentication auth, @PathVariable Long productId) {
        return cartService.removeItem(auth.getName(), productId);
    }

    @DeleteMapping
    public ResponseEntity<Void> clear(Authentication auth) {
        cartService.clear(auth.getName());
        return ResponseEntity.noContent().build();
    }
}