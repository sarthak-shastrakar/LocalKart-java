package com.example.backend.service;

import com.example.backend.dto.request.StoreRequest;
import com.example.backend.dto.response.StoreResponse;
import com.example.backend.exception.ApiException;
import com.example.backend.model.Store;
import com.example.backend.model.StoreStatus;
import com.example.backend.model.User;
import com.example.backend.repository.StoreRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class StoreService {

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    public StoreService(StoreRepository storeRepository, UserRepository userRepository) {
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
    }

    // ---------- owner ----------
    @Transactional
    public StoreResponse create(String ownerEmail, StoreRequest req) {
        User owner = getUser(ownerEmail);
        if (storeRepository.existsByOwnerId(owner.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "You already have a store");
        }
        Store store = new Store();
        store.setOwner(owner);
        apply(store, req);
        return toResponse(storeRepository.save(store));
    }

    @Transactional(readOnly = true)
    public StoreResponse getMyStore(String ownerEmail) {
        return toResponse(findOwnStore(ownerEmail));
    }

    @Transactional
    public StoreResponse updateMyStore(String ownerEmail, StoreRequest req) {
        Store store = findOwnStore(ownerEmail);
        apply(store, req);
        return toResponse(storeRepository.save(store));
    }

    @Transactional
    public StoreResponse setOpen(String ownerEmail, boolean open) {
        Store store = findOwnStore(ownerEmail);
        store.setOpen(open);
        return toResponse(storeRepository.save(store));
    }

    // ---------- public (customers) ----------
    @Transactional(readOnly = true)
    public List<StoreResponse> nearby(double lat, double lng, double radiusKm) {
        double radius = Math.min(Math.max(radiusKm, 0.5), 50); // 0.5 se 50 km ke beech
        return storeRepository.findNearby(lat, lng, radius).stream()
                .map(s -> withDistance(toResponse(s),
                        distanceKm(lat, lng, s.getLatitude(), s.getLongitude())))
                .toList();
    }

    @Transactional(readOnly = true)
    public StoreResponse getApprovedById(Long id) {
        Store store = storeRepository.findById(id)
                .filter(s -> s.getStatus() == StoreStatus.APPROVED && s.getOwner().isEnabled())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Store not found"));
        return toResponse(store);
    }

    // ---------- admin ----------
    @Transactional(readOnly = true)
    public List<StoreResponse> listByStatus(StoreStatus status) {
        return storeRepository.findByStatus(status).stream().map(this::toResponse).toList();
    }

    @Transactional
    public StoreResponse changeStatus(Long id, StoreStatus status) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Store not found"));
        store.setStatus(status);
        return toResponse(storeRepository.save(store));
    }

    // ---------- helpers ----------
    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Store findOwnStore(String email) {
        User owner = getUser(email);
        return storeRepository.findByOwnerId(owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "You have no store yet"));
    }

    private void apply(Store s, StoreRequest r) {
        s.setName(r.getName().trim());
        s.setDescription(r.getDescription());
        s.setCategory(r.getCategory());
        s.setAddress(r.getAddress().trim());
        s.setPincode(r.getPincode());
        s.setLatitude(r.getLatitude());
        s.setLongitude(r.getLongitude());
        s.setOpenTime(r.getOpenTime());
        s.setCloseTime(r.getCloseTime());
        s.setLogoUrl(r.getLogoUrl());
    }

    // do GPS points ke beech seedhi doori (Haversine), km me, 1 decimal tak
    private double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double d = r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(d * 10.0) / 10.0;
    }

    private StoreResponse withDistance(StoreResponse r, double km) {
        return new StoreResponse(r.id(), r.ownerId(), r.name(), r.description(),
                r.category(), r.address(), r.pincode(), r.latitude(), r.longitude(),
                r.openTime(), r.closeTime(), r.logoUrl(), r.status(), r.open(), km);
    }

    private StoreResponse toResponse(Store s) {
        return new StoreResponse(s.getId(), s.getOwner().getId(), s.getName(),
                s.getDescription(), s.getCategory().name(), s.getAddress(), s.getPincode(),
                s.getLatitude(), s.getLongitude(), s.getOpenTime(), s.getCloseTime(),
                s.getLogoUrl(), s.getStatus().name(), s.isOpen());
    }
}