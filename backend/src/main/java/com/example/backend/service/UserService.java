package com.example.backend.service;

import com.example.backend.exception.ApiException;
import com.example.backend.model.*;
import com.example.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final UnblockAppealRepository appealRepository;

    public UserService(UserRepository userRepository,
                       CartRepository cartRepository,
                       StoreRepository storeRepository,
                       ProductRepository productRepository,
                       UnblockAppealRepository appealRepository) {
        this.userRepository = userRepository;
        this.cartRepository = cartRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.appealRepository = appealRepository;
    }

    @Transactional
    public void deleteAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() == Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin accounts cannot be deleted directly");
        }

        Long userId = user.getId();

        // 1. Delete customer cart if exists
        cartRepository.findByCustomerId(userId).ifPresent(cartRepository::delete);

        // 2. If store owner, cascade delete store, products, and referenced cart items
        if (user.getRole() == Role.STORE_OWNER) {
            storeRepository.findByOwnerId(userId).ifPresent(store -> {
                Long storeId = store.getId();
                // Remove cart items across all customer carts that reference this store's products
                cartRepository.deleteCartItemsByStoreId(storeId);
                // Unlink store from any carts that reference it
                cartRepository.unlinkStoreFromCarts(storeId);
                // Delete all products of this store
                productRepository.deleteByStoreId(storeId);
                // Delete store
                storeRepository.delete(store);
            });
        }

        // 3. Delete any appeals filed by this user
        appealRepository.deleteByUserId(userId);

        // 4. Finally delete user from DB
        userRepository.delete(user);
    }
}
