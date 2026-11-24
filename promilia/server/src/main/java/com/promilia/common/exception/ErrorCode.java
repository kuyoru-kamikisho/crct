package com.promilia.common.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {

    SUCCESS(0, "成功"),
    BAD_REQUEST(40000, "请求参数不合法"),
    UNAUTHORIZED(40100, "未登录或登录已过期"),
    FORBIDDEN(40300, "无权限访问"),
    NOT_FOUND(40400, "资源不存在"),
    TOO_MANY_REQUESTS(42900, "请求过于频繁，请稍后再试"),
    DUPLICATE_SUBMIT(42901, "请勿重复提交"),

    CAPTCHA_INVALID(40001, "图片验证码错误或已过期"),
    EMAIL_CODE_INVALID(40002, "邮箱验证码错误或已过期"),
    EMAIL_CODE_SEND_TOO_FAST(40003, "验证码发送过于频繁，请稍后再试"),
    NICKNAME_EXISTS(40004, "昵称已存在"),
    EMAIL_EXISTS(40005, "邮箱已注册"),
    EMAIL_NOT_FOUND(40006, "邮箱未注册"),
    PASSWORD_INVALID(40007, "邮箱或密码错误"),
    RESET_TOKEN_INVALID(40008, "重置凭证无效或已过期"),
    AVATAR_INVALID(40009, "头像文件不合法"),
    PROFILE_FIELD_FORBIDDEN(40010, "该字段不允许修改"),
    PASSWORD_CIPHER_INVALID(40011, "密码密文无效，请刷新后重试"),

    MAIL_SEND_FAILED(50001, "邮件发送失败"),
    MAIL_RECEIVE_FAILED(50002, "邮件接收失败"),
    INTERNAL_ERROR(50000, "系统内部错误");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
