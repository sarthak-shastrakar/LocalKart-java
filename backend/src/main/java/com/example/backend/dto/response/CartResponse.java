package com.example.backend.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(
        Long storeId, String storeName, boolean storeOpen,
        List<CartItemResponse> items, int totalItems,
        BigDecimal subtotal, boolean hasUnavailableItems) {
}