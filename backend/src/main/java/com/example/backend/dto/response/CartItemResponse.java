package com.example.backend.dto.response;

import java.math.BigDecimal;

public record CartItemResponse(
        Long productId,
        Long storeId,
        String storeName,
        boolean storeOpen,
        String name,
        String imageUrl,
        BigDecimal unitPrice,
        int quantity,
        int stock,
        BigDecimal lineTotal,
        boolean available) {
}