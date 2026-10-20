package com.example.backend.controller;

import com.example.backend.dto.request.ProductRequest;
import com.example.backend.dto.response.PageResponse;
import com.example.backend.dto.response.ProductResponse;
import com.example.backend.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    // ---- store owner ----
    @PostMapping("/owner/products")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<ProductResponse> create(Authentication auth,
            @Valid @RequestBody ProductRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productService.create(auth.getName(), req));
    }

    @GetMapping("/owner/products")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public PageResponse<ProductResponse> listMine(Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return productService.listMine(auth.getName(), page, size);
    }

    @PutMapping("/owner/products/{id}")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ProductResponse update(Authentication auth, @PathVariable Long id,
            @Valid @RequestBody ProductRequest req) {
        return productService.update(auth.getName(), id, req);
    }

    @PatchMapping("/owner/products/{id}/stock")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ProductResponse updateStock(Authentication auth, @PathVariable Long id,
            @RequestParam int value) {
        return productService.updateStock(auth.getName(), id, value);
    }

    @DeleteMapping("/owner/products/{id}")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable Long id) {
        productService.deactivate(auth.getName(), id);
        return ResponseEntity.noContent().build();
    }

    // ---- public (customers) ----
    @GetMapping("/products")
    public PageResponse<ProductResponse> listAll(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return productService.listAll(q, page, size);
    }

    @GetMapping("/stores/{storeId}/products")
    public PageResponse<ProductResponse> forStore(@PathVariable Long storeId,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return productService.listForStore(storeId, q, page, size);
    }
}