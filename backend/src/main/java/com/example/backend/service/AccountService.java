package com.example.backend.service;

import com.example.backend.exception.ApiException;
import com.example.backend.model.Product;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import com.example.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AccountService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final CartRepository cartRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UnblockAppealRepository appealRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountService(UserRepository userRepository,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            CartRepository cartRepository,
            RefreshTokenRepository refreshTokenRepository,
            UnblockAppealRepository appealRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.cartRepository = cartRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.appealRepository = appealRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void deleteAccount(String email, String password) {
        User u = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (u.getRole() == Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin accounts cannot be deleted");
        }
        // 400 (401 nahi) taaki frontend ka "session expired" interceptor trigger na ho
        if (password == null || !passwordEncoder.matches(password, u.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Incorrect password");
        }
        Long userId = u.getId();

        // 1. sessions aur appeals
        refreshTokenRepository.deleteAllByUser(userId);
        appealRepository.deleteAllByUser(userId);

        // 2. apna cart (items cascade se jate hain)
        cartRepository.findByCustomerId(userId).ifPresent(cartRepository::delete);

        // 3. owner ho to store ki saari cheezein
        storeRepository.findByOwnerId(userId).ifPresent(store -> {
            Long storeId = store.getId();
            cartRepository.deleteItemsOfStore(storeId); // dusron ke carts se items
            cartRepository.detachStore(storeId); // carts.store_id null
            List<Product> products = productRepository.findAllByStoreId(storeId);
            productRepository.deleteAll(products); // product_images bhi jate hain
            productRepository.flush();
            storeRepository.delete(store);
            storeRepository.flush();
        });

        // 4. antim me user
        userRepository.delete(u);
    }
}