package com.example.backend.repository;

import com.example.backend.model.Store;
import com.example.backend.model.StoreStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {

    Optional<Store> findByOwnerId(Long ownerId);

    boolean existsByOwnerId(Long ownerId);

    List<Store> findByStatus(StoreStatus status);

    @Query(value = """
            SELECT s.* FROM stores s
            JOIN users u ON u.id = s.owner_id
            WHERE s.status = 'APPROVED' AND u.enabled = true
              AND (6371 * acos(least(1.0,
                    cos(radians(:lat)) * cos(radians(s.latitude))
                    * cos(radians(s.longitude) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(s.latitude))))) <= :radius
            ORDER BY (6371 * acos(least(1.0,
                    cos(radians(:lat)) * cos(radians(s.latitude))
                    * cos(radians(s.longitude) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(s.latitude)))))
            """, nativeQuery = true)
    List<Store> findNearby(@Param("lat") double lat,
            @Param("lng") double lng,
            @Param("radius") double radiusKm);
}