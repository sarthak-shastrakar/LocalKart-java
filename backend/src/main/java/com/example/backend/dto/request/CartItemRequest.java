package com.example.backend.dto.request;

import jakarta.validation.constraints.*;

public class CartItemRequest {
    @NotNull(message = "productId is required")
    private Long productId;

    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 20, message = "Quantity cannot be more than 20")
    private int quantity = 1;

    // true = dusre store ka cart saaf karke ye item daalo
    private boolean replace = false;

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public boolean isReplace() {
        return replace;
    }

    public void setReplace(boolean replace) {
        this.replace = replace;
    }
}