package com.promilia.user.dto;

import com.promilia.user.enums.Gender;
import com.promilia.user.enums.UserRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class UserProfileResponse {
    private Long id;
    private String email;
    private String nickname;
    private String avatarUrl;
    private String signature;
    private LocalDate birthday;
    private Integer age;
    private Gender gender;
    private UserRole role;
    /** 最新登录 IP 对应的省/直辖市，社区展示用 */
    private String ipLocation;
    private List<String> loginIps;
}
