package com.example.backend.dto.request;

import jakarta.validation.constraints.Size;

public class AppealDecisionRequest {
    @Size(max = 500)
    private String note;

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}