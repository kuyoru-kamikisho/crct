package com.promilia.auth.dto;

import lombok.Data;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class RegisterConfirmRequest {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotBlank(message = "邮箱验证码不能为空")
    @Size(min = 6, max = 6, message = "邮箱验证码必须为 6 位")
    private String emailCode;

    /** RSA-OAEP 加密后的 Base64 密文（明文长度由服务端解密后校验） */
    @NotBlank(message = "密码不能为空")
    @Size(max = 1024, message = "密码密文过长")
    private String password;

    @NotBlank(message = "昵称不能为空")
    @Size(min = 2, max = 32, message = "昵称长度需在 2~32 之间")
    private String nickname;
}
