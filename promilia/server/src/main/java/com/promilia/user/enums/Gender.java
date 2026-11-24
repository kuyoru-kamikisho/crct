package com.promilia.user.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum Gender {
    UNKNOWN(0, "未知"),
    MALE(1, "男"),
    FEMALE(2, "女");

    @EnumValue
    @JsonValue
    private final int code;
    private final String label;

    Gender(int code, String label) {
        this.code = code;
        this.label = label;
    }

    @JsonCreator
    public static Gender fromCode(Integer code) {
        if (code == null) {
            return UNKNOWN;
        }
        for (Gender gender : values()) {
            if (gender.code == code) {
                return gender;
            }
        }
        throw new IllegalArgumentException("非法性别值: " + code);
    }
}
