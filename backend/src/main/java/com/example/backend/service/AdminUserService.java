package com.example.backend.service;

import com.example.backend.dto.request.BlockRequest;
import com.example.backend.dto.response.PageResponse;
import com.example.backend.dto.response.UserSummary;
import com.example.backend.exception.ApiException;
import com.example.backend.model.*;
import com.example.backend.repository.UnblockAppealRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final UnblockAppealRepository appealRepository;

    public AdminUserService(UserRepository userRepository,
            UnblockAppealRepository appealRepository) {
        this.userRepository = userRepository;
        this.appealRepository = appealRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<UserSummary> list(Role role, String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0),
                Math.min(Math.max(size, 1), 50), Sort.by("id").descending());
        Page<User> result;
        if (q != null && !q.isBlank()) {
            result = userRepository
                    .findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(q.trim(), q.trim(), pageable);
        } else if (role != null) {
            result = userRepository.findByRole(role, pageable);
        } else {
            result = userRepository.findAll(pageable);
        }
        return new PageResponse<>(
                result.getContent().stream().map(this::toSummary).toList(),
                result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional
    public UserSummary block(String adminEmail, Long userId, BlockRequest req) {
        User admin = getByEmail(adminEmail);
        User target = findTarget(admin, userId);
        if (!target.isEnabled()) {
            throw new ApiException(HttpStatus.CONFLICT, "User is already blocked");
        }
        BlockReason reason = (req == null || req.getReason() == null)
                ? BlockReason.OTHER
                : req.getReason();
        String note = (req == null) ? null : req.getNote();
        target.markBlocked(admin.getId(), reason, note);
        return toSummary(userRepository.save(target));
    }

    @Transactional
    public UserSummary unblock(String adminEmail, Long userId) {
        User admin = getByEmail(adminEmail);
        User target = findTarget(admin, userId);
        target.clearBlock();
        userRepository.save(target);

        // direct unblock ho gaya to pending appeal bhi band karo
        for (UnblockAppeal a : appealRepository.findByUserIdAndStatus(userId, AppealStatus.PENDING)) {
            a.setStatus(AppealStatus.APPROVED);
            a.setReviewedBy(admin);
            a.setReviewedAt(LocalDateTime.now());
            a.setAdminNote("Unblocked by admin");
            appealRepository.save(a);
        }
        return toSummary(target);
    }

    private User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private User findTarget(User admin, Long userId) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (target.getRole() == Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin accounts cannot be blocked");
        }
        if (target.getId().equals(admin.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You cannot block yourself");
        }
        return target;
    }

    private UserSummary toSummary(User u) {
        String blockedByName = null;
        if (!u.isEnabled() && u.getBlockedBy() != null) {
            blockedByName = userRepository.findById(u.getBlockedBy())
                    .map(User::getName).orElse(null);
        }
        return new UserSummary(u.getId(), u.getName(), u.getEmail(), u.getPhone(),
                u.getRole().name(), u.isEnabled(),
                u.getBlockedReason() == null ? null : u.getBlockedReason().name(),
                u.getBlockedNote(), u.getBlockedAt(), blockedByName);
    }
}