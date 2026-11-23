package com.promilia.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private long expireInSeconds;
    private Long userId;
    private String email;
    private String nickname;
}
