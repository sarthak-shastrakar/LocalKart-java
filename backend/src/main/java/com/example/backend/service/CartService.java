package com.example.backend.service;

import com.example.backend.dto.request.CartItemRequest;
import com.example.backend.dto.response.CartItemResponse;
import com.example.backend.dto.response.CartResponse;
import com.example.backend.exception.ApiException;
import com.example.backend.model.*;
import com.example.backend.repository.CartRepository;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class CartService {

    private static final int MAX_PER_ITEM = 20;

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public CartService(CartRepository cartRepository,
            ProductRepository productRepository,
            UserRepository userRepository) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public CartResponse get(String email) {
        User user = getUser(email);
        return cartRepository.findByCustomerId(user.getId())
                .map(this::toResponse)
                .orElseGet(this::emptyResponse);
    }

    @Transactional
    public CartResponse addItem(String email, CartItemRequest req) {
        User user = getUser(email);

        Product product = productRepository.findById(req.getProductId())
                .filter(Product::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        Store store = product.getStore();
        if (store.getStatus() != StoreStatus.APPROVED || !store.getOwner().isEnabled()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Product not found");
        }
        if (!store.isOpen()) {
            throw new ApiException(HttpStatus.CONFLICT, "This store is closed right now");
        }

        Cart cart = cartRepository.findByCustomerId(user.getId())
                .orElseGet(() -> newCart(user));

        // Find existing item in cart
        CartItem item = findItem(cart, product.getId());
        int newQty = (item == null ? 0 : item.getQuantity()) + req.getQuantity();
        validateQuantity(product, newQty);

        if (item == null) {
            item = new CartItem();
            item.setCart(cart);
            item.setProduct(product);
            cart.getItems().add(item);
        }
        item.setQuantity(newQty);

        return toResponse(cartRepository.save(cart));
    }

    @Transactional
    public CartResponse setQuantity(String email, Long productId, int quantity) {
        if (quantity < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Quantity must be at least 1. Use remove to delete the item.");
        }
        Cart cart = getCart(email);
        CartItem item = findItem(cart, productId);
        if (item == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Item not in cart");
        }
        validateQuantity(item.getProduct(), quantity);
        item.setQuantity(quantity);
        return toResponse(cartRepository.save(cart));
    }

    @Transactional
    public CartResponse removeItem(String email, Long productId) {
        Cart cart = getCart(email);
        CartItem item = findItem(cart, productId);
        if (item == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Item not in cart");
        }
        cart.getItems().remove(item);
        if (cart.getItems().isEmpty()) {
            cart.setStore(null);
        }
        return toResponse(cartRepository.save(cart));
    }

    @Transactional
    public void clear(String email) {
        User user = getUser(email);
        cartRepository.findByCustomerId(user.getId()).ifPresent(cart -> {
            cart.getItems().clear();
            cart.setStore(null);
            cartRepository.save(cart);
        });
    }

    // ---------- helpers ----------
    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Cart getCart(String email) {
        User user = getUser(email);
        return cartRepository.findByCustomerId(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Your cart is empty"));
    }

    private Cart newCart(User user) {
        Cart c = new Cart();
        c.setCustomer(user);
        return cartRepository.save(c);
    }

    private CartItem findItem(Cart cart, Long productId) {
        for (CartItem i : cart.getItems()) {
            if (i.getProduct().getId().equals(productId))
                return i;
        }
        return null;
    }

    private void validateQuantity(Product p, int qty) {
        if (qty > MAX_PER_ITEM) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "You can add at most " + MAX_PER_ITEM + " of one item");
        }
        if (p.getStock() <= 0) {
            throw new ApiException(HttpStatus.CONFLICT, p.getName() + " is out of stock");
        }
        if (qty > p.getStock()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Only " + p.getStock() + " left in stock for " + p.getName());
        }
    }

    private CartResponse emptyResponse() {
        return new CartResponse(null, null, false, List.of(), 0, BigDecimal.ZERO, false);
    }

    private CartResponse toResponse(Cart cart) {
        List<CartItemResponse> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        int totalItems = 0;
        boolean hasUnavailable = false;

        for (CartItem i : cart.getItems()) {
            Product p = i.getProduct();
            Store s = p.getStore();
            boolean isStoreOk = s != null && s.getStatus() == StoreStatus.APPROVED && s.getOwner().isEnabled() && s.isOpen();
            boolean available = p.isActive() && isStoreOk && p.getStock() >= i.getQuantity();
            if (!available)
                hasUnavailable = true;
            BigDecimal line = p.getPrice().multiply(BigDecimal.valueOf(i.getQuantity()));
            subtotal = subtotal.add(line);
            totalItems += i.getQuantity();
            String image = p.getImageUrls().isEmpty() ? null : p.getImageUrls().get(0);
            items.add(new CartItemResponse(
                    p.getId(),
                    s == null ? null : s.getId(),
                    s == null ? null : s.getName(),
                    s != null && s.isOpen(),
                    p.getName(),
                    image,
                    p.getPrice(),
                    i.getQuantity(),
                    p.getStock(),
                    line,
                    available));
        }

        Long commonStoreId = null;
        String commonStoreName = null;
        boolean commonStoreOpen = false;
        if (!items.isEmpty()) {
            Long firstStoreId = items.get(0).storeId();
            boolean allSame = items.stream().allMatch(it -> it.storeId() != null && it.storeId().equals(firstStoreId));
            if (allSame) {
                commonStoreId = firstStoreId;
                commonStoreName = items.get(0).storeName();
                commonStoreOpen = items.get(0).storeOpen();
            }
        }

        return new CartResponse(
                commonStoreId,
                commonStoreName,
                commonStoreOpen,
                items, totalItems, subtotal, hasUnavailable);
    }
}