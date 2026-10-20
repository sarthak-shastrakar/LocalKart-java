package com.example.backend.dto.request;

import com.example.backend.model.BlockReason;
import jakarta.validation.constraints.Size;

public class BlockRequest {
    private BlockReason reason;
    @Size(max = 500)
    private String note;

    public BlockReason getReason() {
        return reason;
    }

    public void setReason(BlockReason reason) {
        this.reason = reason;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}