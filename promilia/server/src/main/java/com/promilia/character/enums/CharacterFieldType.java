package com.promilia.character.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum CharacterFieldType {
    HEIGHT("HEIGHT", "身高"),
    WEIGHT("WEIGHT", "体重"),
    MEASUREMENTS("MEASUREMENTS", "三围"),
    CUP_SIZE("CUP_SIZE", "大小"),
    RACE("RACE", "种族"),
    BIRTHDAY("BIRTHDAY", "生日"),
    RATING("RATING", "评分");

    @EnumValue
    @JsonValue
    private final String code;
    private final String label;

    CharacterFieldType(String code, String label) {
        this.code = code;
        this.label = label;
    }

    @JsonCreator
    public static CharacterFieldType fromCode(String code) {
        if (code == null) {
            return null;
        }
        for (CharacterFieldType type : values()) {
            if (type.code.equalsIgnoreCase(code) || type.name().equalsIgnoreCase(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("非法字段类型: " + code);
    }
}
