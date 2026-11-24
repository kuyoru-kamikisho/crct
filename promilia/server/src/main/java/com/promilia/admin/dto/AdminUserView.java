package com.promilia.admin.dto;

import com.promilia.user.enums.Gender;
import com.promilia.user.enums.UserRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AdminUserView {
    private Long id;
    private String email;
    private String nickname;
    private String avatarUrl;
    private String signature;
    private LocalDate birthday;
    private Integer age;
    private Gender gender;
    private UserRole role;
    private boolean banned;
    private LocalDateTime banUntil;
    private String banReason;
    private List<String> loginIps;
    private String ipLocation;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
