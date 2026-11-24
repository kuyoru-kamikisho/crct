package com.promilia.character.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CupSize {
    A, B, C, D, E, F, G, H, I, J, K, L;

    @JsonValue
    public String getCode() {
        return name();
    }

    @JsonCreator
    public static CupSize from(String code) {
        if (code == null) {
            return null;
        }
        return CupSize.valueOf(code.trim().toUpperCase());
    }
}
