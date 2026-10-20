package com.example.backend.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record ProductResponse(
        Long id, Long storeId, String name, String description,
        BigDecimal price, int stock, String category,
        String imageUrl, List<String> imageUrls, boolean active) {
}