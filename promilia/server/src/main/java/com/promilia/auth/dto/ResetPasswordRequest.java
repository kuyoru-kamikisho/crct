package com.promilia.auth.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class ResetPasswordRequest {

    @NotBlank(message = "重置 Token 不能为空")
    private String resetToken;

    /** RSA-OAEP 加密后的 Base64 密文（明文长度由服务端解密后校验） */
    @NotBlank(message = "新密码不能为空")
    @Size(max = 1024, message = "密码密文过长")
    private String newPassword;

    @NotBlank(message = "图片验证码 ID 不能为空")
    private String captchaId;

    @NotBlank(message = "图片验证码不能为空")
    private String captchaCode;
}
