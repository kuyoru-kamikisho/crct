package com.promilia.user.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class ChangePasswordRequest {

    /** RSA-OAEP 加密后的旧密码密文 */
    @NotBlank(message = "旧密码不能为空")
    @Size(max = 1024, message = "密码密文过长")
    private String oldPassword;

    /** RSA-OAEP 加密后的新密码密文 */
    @NotBlank(message = "新密码不能为空")
    @Size(max = 1024, message = "密码密文过长")
    private String newPassword;

    @NotBlank(message = "图片验证码 ID 不能为空")
    private String captchaId;

    @NotBlank(message = "图片验证码不能为空")
    private String captchaCode;
}
