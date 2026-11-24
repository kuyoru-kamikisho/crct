package com.promilia.user.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum UserRole {
    USER(0, "普通用户"),
    ADMIN(1, "管理员");

    @EnumValue
    @JsonValue
    private final int code;
    private final String label;

    UserRole(int code, String label) {
        this.code = code;
        this.label = label;
    }

    @JsonCreator
    public static UserRole fromCode(Integer code) {
        if (code == null) {
            return USER;
        }
        for (UserRole role : values()) {
            if (role.code == code) {
                return role;
            }
        }
        throw new IllegalArgumentException("非法角色值: " + code);
    }
}
