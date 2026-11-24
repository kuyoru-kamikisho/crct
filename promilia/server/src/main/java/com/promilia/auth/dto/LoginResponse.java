package com.promilia.auth.dto;

import com.promilia.user.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private long expireInSeconds;
    private Long userId;
    private String email;
    private String nickname;
    private UserRole role;
    private String ipLocation;
    private List<String> loginIps;
}
