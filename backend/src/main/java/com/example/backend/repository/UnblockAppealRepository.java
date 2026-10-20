package com.example.backend.repository;

import com.example.backend.model.AppealStatus;
import com.example.backend.model.UnblockAppeal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UnblockAppealRepository extends JpaRepository<UnblockAppeal, Long> {

    boolean existsByUserIdAndStatus(Long userId, AppealStatus status);

    Optional<UnblockAppeal> findTopByUserIdOrderByIdDesc(Long userId);

    List<UnblockAppeal> findByUserIdAndStatus(Long userId, AppealStatus status);

    Page<UnblockAppeal> findByStatus(AppealStatus status, Pageable pageable);

    Page<UnblockAppeal> findByStatusAndAssignedAdminId(AppealStatus status, Long adminId, Pageable pageable);

    long countByStatus(AppealStatus status);

    long countByStatusAndAssignedAdminId(AppealStatus status, Long adminId);

    void deleteByUserId(Long userId);
}