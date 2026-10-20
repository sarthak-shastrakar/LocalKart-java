package com.example.backend.repository;

import com.example.backend.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {

    // customer ke liye: sirf active products, naam se search
    Page<Product> findByStoreIdAndActiveTrueAndNameContainingIgnoreCase(
            Long storeId, String name, Pageable pageable);

    // customer homepage ke liye: approved stores ke active products
    @org.springframework.data.jpa.repository.Query("SELECT p FROM Product p WHERE p.active = true AND p.store.status = com.example.backend.model.StoreStatus.APPROVED AND p.store.owner.enabled = true AND LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<Product> findAllActiveForPublic(@org.springframework.data.repository.query.Param("q") String q, Pageable pageable);

    // owner ke liye: apne saare products
    Page<Product> findByStoreId(Long storeId, Pageable pageable);

    void deleteByStoreId(Long storeId);
}