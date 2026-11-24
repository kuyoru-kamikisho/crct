package com.promilia.admin.dto;

import com.promilia.user.enums.Gender;
import com.promilia.user.enums.UserRole;
import lombok.Data;

import javax.validation.constraints.Size;
import java.time.LocalDate;

@Data
public class AdminUpdateUserRequest {

    @Size(min = 2, max = 32, message = "昵称长度需在 2~32 之间")
    private String nickname;

    @Size(max = 50, message = "个性签名最多 50 字")
    private String signature;

    private LocalDate birthday;

    private Gender gender;

    private UserRole role;
}
