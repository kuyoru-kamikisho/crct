package com.promilia.auth.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class ResetPasswordRequest {

    @NotBlank(message = "重置 Token 不能为空")
    private String resetToken;

    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, max = 64, message = "密码长度需在 6~64 之间")
    private String newPassword;

    @NotBlank(message = "图片验证码 ID 不能为空")
    private String captchaId;

    @NotBlank(message = "图片验证码不能为空")
    private String captchaCode;
}
