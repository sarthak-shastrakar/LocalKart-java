package com.example.backend.dto.response;

import java.time.LocalTime;

public record StoreResponse(
                Long id, Long ownerId, String name, String description,
                String category, String address, String pincode,
                double latitude, double longitude,
                LocalTime openTime, LocalTime closeTime, String logoUrl,
                String status, boolean open,
                Double distanceKm) {

        public StoreResponse(Long id, Long ownerId, String name, String description,
                        String category, String address, String pincode,
                        double latitude, double longitude,
                        LocalTime openTime, LocalTime closeTime, String logoUrl,
                        String status, boolean open) {
                this(id, ownerId, name, description, category, address, pincode,
                                latitude, longitude, openTime, closeTime, logoUrl, status, open, null);
        }
}