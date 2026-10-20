package com.example.backend.service;

import com.example.backend.dto.request.AppealRequest;
import com.example.backend.dto.request.AppealStatusRequest;
import com.example.backend.dto.response.AppealResponse;
import com.example.backend.dto.response.AppealStatusResponse;
import com.example.backend.dto.response.PageResponse;
import com.example.backend.exception.ApiException;
import com.example.backend.model.AppealStatus;
import com.example.backend.model.UnblockAppeal;
import com.example.backend.model.User;
import com.example.backend.repository.UnblockAppealRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AppealService {

    private static final int COOLDOWN_DAYS = 7;

    private final UnblockAppealRepository appealRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AppealService(UnblockAppealRepository appealRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.appealRepository = appealRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ================= public (blocked user, bina login) =================

    @Transactional
    public AppealStatusResponse submit(AppealRequest req) {
        User user = verify(req.getEmail(), req.getPassword());

        if (user.isEnabled()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Your account is not blocked");
        }
        if (appealRepository.existsByUserIdAndStatus(user.getId(), AppealStatus.PENDING)) {
            throw new ApiException(HttpStatus.CONFLICT, "Appeal already submitted. Please wait for a decision.");
        }
        appealRepository.findTopByUserIdOrderByIdDesc(user.getId()).ifPresent(last -> {
            LocalDateTime again = cooldownEnd(last);
            if (again != null && again.isAfter(LocalDateTime.now())) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                        "Your last appeal was rejected. You can appeal again after " + again.toLocalDate());
            }
        });

        UnblockAppeal a = new UnblockAppeal();
        a.setUser(user);
        a.setMessage(req.getMessage().trim());
        a.setBlockReason(user.getBlockedReason());
        a.setBlockNote(user.getBlockedNote());
        a.setBlockedAt(user.getBlockedAt());
        if (user.getBlockedBy() != null) {
            a.setAssignedAdmin(userRepository.findById(user.getBlockedBy()).orElse(null));
        }
        return toStatus(appealRepository.save(a));
    }

    @Transactional(readOnly = true)
    public AppealStatusResponse status(AppealStatusRequest req) {
        User user = verify(req.getEmail(), req.getPassword());
        UnblockAppeal a = appealRepository.findTopByUserIdOrderByIdDesc(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No appeal found"));
        return toStatus(a);
    }

    // ================= admin =================

    @Transactional(readOnly = true)
    public PageResponse<AppealResponse> list(String adminEmail, AppealStatus status,
            boolean mine, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0),
                Math.min(Math.max(size, 1), 50), Sort.by("id").descending());
        Page<UnblockAppeal> result = mine
                ? appealRepository.findByStatusAndAssignedAdminId(status, getAdmin(adminEmail).getId(), pageable)
                : appealRepository.findByStatus(status, pageable);
        return new PageResponse<>(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public Map<String, Long> pendingCounts(String adminEmail) {
        Long adminId = getAdmin(adminEmail).getId();
        Map<String, Long> m = new LinkedHashMap<>();
        m.put("mine", appealRepository.countByStatusAndAssignedAdminId(AppealStatus.PENDING, adminId));
        m.put("all", appealRepository.countByStatus(AppealStatus.PENDING));
        return m;
    }

    @Transactional
    public AppealResponse approve(String adminEmail, Long id, String note) {
        User admin = getAdmin(adminEmail);
        UnblockAppeal a = getPending(id);
        User user = a.getUser();
        user.clearBlock();
        userRepository.save(user);
        return toResponse(finish(a, AppealStatus.APPROVED, admin, note));
    }

    @Transactional
    public AppealResponse reject(String adminEmail, Long id, String note) {
        if (note == null || note.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Reason is required when rejecting");
        }
        User admin = getAdmin(adminEmail);
        UnblockAppeal a = getPending(id);
        return toResponse(finish(a, AppealStatus.REJECTED, admin, note));
    }

    // ================= helpers =================

    private User verify(String email, String password) {
        User u = userRepository.findByEmail(email.trim().toLowerCase()).orElse(null);
        if (u == null || !passwordEncoder.matches(password, u.getPassword())) {
            // 400 (401 nahi) taaki frontend ka "session expired" interceptor trigger na ho
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid details");
        }
        return u;
    }

    private User getAdmin(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private UnblockAppeal getPending(Long id) {
        UnblockAppeal a = appealRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Appeal not found"));
        if (a.getStatus() != AppealStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "Appeal already decided");
        }
        return a;
    }

    private UnblockAppeal finish(UnblockAppeal a, AppealStatus status, User admin, String note) {
        a.setStatus(status);
        a.setReviewedBy(admin);
        a.setReviewedAt(LocalDateTime.now());
        a.setAdminNote(note == null || note.isBlank() ? null : note.trim());
        return appealRepository.save(a);
    }

    private LocalDateTime cooldownEnd(UnblockAppeal a) {
        if (a.getStatus() == AppealStatus.REJECTED && a.getReviewedAt() != null) {
            return a.getReviewedAt().plusDays(COOLDOWN_DAYS);
        }
        return null;
    }

    private AppealStatusResponse toStatus(UnblockAppeal a) {
        return new AppealStatusResponse(a.getId(), a.getStatus().name(), a.getAdminNote(),
                a.getCreatedAt(), a.getReviewedAt(), cooldownEnd(a));
    }

    private AppealResponse toResponse(UnblockAppeal a) {
        User u = a.getUser();
        User by = a.getAssignedAdmin();
        return new AppealResponse(a.getId(), u.getId(), u.getName(), u.getEmail(), u.getRole().name(),
                a.getMessage(), a.getStatus().name(),
                a.getBlockReason() == null ? null : a.getBlockReason().name(),
                a.getBlockNote(), a.getBlockedAt(),
                by == null ? null : by.getId(),
                by == null ? "Unknown" : by.getName(),
                a.getAdminNote(),
                a.getReviewedBy() == null ? null : a.getReviewedBy().getName(),
                a.getCreatedAt(), a.getReviewedAt());
    }
}