package com.example.backend.repository;

import com.example.backend.model.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {
    Optional<Cart> findByCustomerId(Long customerId);

    @Modifying
    @Query("DELETE FROM CartItem ci WHERE ci.product.store.id = :storeId")
    void deleteCartItemsByStoreId(@Param("storeId") Long storeId);

    @Modifying
    @Query("UPDATE Cart c SET c.store = null WHERE c.store.id = :storeId")
    void unlinkStoreFromCarts(@Param("storeId") Long storeId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from CartItem i where i.product.id in "
            + "(select p.id from Product p where p.store.id = :storeId)")
    int deleteItemsOfStore(@Param("storeId") Long storeId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Cart c set c.store = null where c.store.id = :storeId")
    int detachStore(@Param("storeId") Long storeId);
}