package com.promilia.user.dto;

import com.promilia.user.enums.Gender;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

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
    private String ipLocation;
}
