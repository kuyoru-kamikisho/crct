package com.promilia.auth.dto;

import lombok.Data;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class LoginRequest {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    /** RSA-OAEP 加密后的 Base64 密文 */
    @NotBlank(message = "密码不能为空")
    @Size(max = 1024, message = "密码密文过长")
    private String password;

    @NotBlank(message = "图片验证码 ID 不能为空")
    private String captchaId;

    @NotBlank(message = "图片验证码不能为空")
    private String captchaCode;
}
