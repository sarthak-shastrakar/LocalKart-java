package com.example.backend.service;

import com.example.backend.dto.request.ProductRequest;
import com.example.backend.dto.response.PageResponse;
import com.example.backend.dto.response.ProductResponse;
import com.example.backend.exception.ApiException;
import com.example.backend.model.*;
import com.example.backend.repository.*;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final ImageUploadService imageUploadService;

    public ProductService(ProductRepository productRepository,
            StoreRepository storeRepository,
            UserRepository userRepository,
            ImageUploadService imageUploadService) {
        this.productRepository = productRepository;
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
        this.imageUploadService = imageUploadService;
    }

    // ---------- owner ----------
    @Transactional
    public ProductResponse create(String ownerEmail, ProductRequest req) {
        Store store = findOwnStore(ownerEmail);
        Product p = new Product();
        p.setStore(store);
        apply(p, req);
        return toResponse(productRepository.save(p));
    }

    @Transactional
    public ProductResponse update(String ownerEmail, Long productId, ProductRequest req) {
        Product p = findOwnProduct(ownerEmail, productId);
        List<String> oldUrls = new ArrayList<>(p.getImageUrls());

        apply(p, req);
        Product saved = productRepository.save(p);

        List<String> removed = oldUrls.stream()
                .filter(u -> !saved.getImageUrls().contains(u))
                .toList();
        imageUploadService.deleteAfterCommit(removed);
        return toResponse(saved);
    }

    @Transactional
    public ProductResponse updateStock(String ownerEmail, Long productId, int stock) {
        if (stock < 0)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Stock cannot be negative");
        Product p = findOwnProduct(ownerEmail, productId);
        p.setStock(stock);
        return toResponse(productRepository.save(p));
    }

    // soft delete: row delete nahi hoti, sirf customers ko dikhna band
    @Transactional
    public void deactivate(String ownerEmail, Long productId) {
        Product p = findOwnProduct(ownerEmail, productId);
        p.setActive(false);
        productRepository.save(p);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> listMine(String ownerEmail, int page, int size) {
        Store store = findOwnStore(ownerEmail);
        return toPage(productRepository.findByStoreIdAndActiveTrue(store.getId(), pageable(page, size)));
    }

    // ---------- public (customers) ----------
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> listAll(String q, int page, int size) {
        String query = q == null ? "" : q.trim();
        return toPage(productRepository.findAllActiveForPublic(query, pageable(page, size)));
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> listForStore(Long storeId, String q, int page, int size) {
        Store store = storeRepository.findById(storeId)
                .filter(s -> s.getStatus() == StoreStatus.APPROVED && s.getOwner().isEnabled())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Store not found"));
        return toPage(productRepository
                .findByStoreIdAndActiveTrueAndNameContainingIgnoreCase(
                        store.getId(), q == null ? "" : q.trim(), pageable(page, size)));
    }

    // ---------- helpers ----------
    private Store findOwnStore(String email) {
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        return storeRepository.findByOwnerId(owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Create a store first"));
    }

    // ownership check: product isi owner ke store ka hona chahiye
    private Product findOwnProduct(String email, Long productId) {
        Store store = findOwnStore(email);
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        if (!p.getStore().getId().equals(store.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This product is not in your store");
        }
        return p;
    }

    private Pageable pageable(int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        return PageRequest.of(Math.max(page, 0), safeSize, Sort.by("id").descending());
    }

    private void apply(Product p, ProductRequest r) {
        List<String> urls = r.getImageUrls() == null ? List.of()
                : r.getImageUrls().stream().distinct().toList();
        if (urls.isEmpty() || urls.size() > 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A product needs 1 to 5 images");
        }
        for (String u : urls) {
            if (!imageUploadService.isOurImage(u)) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Invalid image URL. Upload images through LocalKart.");
            }
        }

        p.setName(r.getName().trim());
        p.setDescription(r.getDescription());
        p.setPrice(r.getPrice());
        p.setStock(r.getStock());
        p.setCategory(r.getCategory());
        p.getImageUrls().clear();
        p.getImageUrls().addAll(urls);
    }

    private PageResponse<ProductResponse> toPage(Page<Product> page) {
        return new PageResponse<>(
                page.getContent().stream().map(this::toResponse).toList(),
                page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }

    private ProductResponse toResponse(Product p) {
        List<String> imgs = new ArrayList<>(p.getImageUrls());
        return new ProductResponse(p.getId(), p.getStore().getId(), p.getName(),
                p.getDescription(), p.getPrice(), p.getStock(), p.getCategory(),
                imgs.isEmpty() ? null : imgs.get(0), imgs, p.isActive());
    }
}