package com.promilia.user.dto;

import com.promilia.user.enums.Gender;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import javax.validation.constraints.Size;
import java.time.LocalDate;

@Data
public class UpdateProfileRequest {

    @Size(max = 50, message = "个性签名最多 50 个字符")
    private String signature;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthday;

    private Gender gender;
}
