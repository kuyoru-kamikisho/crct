package com.promilia.common.redis;

public final class RedisKeys {

    private RedisKeys() {
    }

    public static String captcha(String captchaId) {
        return "captcha:" + captchaId;
    }

    public static String emailCode(String email) {
        return "email:code:" + email.toLowerCase();
    }

    public static String emailCodeSendLock(String email) {
        return "email:code:lock:" + email.toLowerCase();
    }

    public static String resetToken(String token) {
        return "auth:reset:" + token;
    }

    public static String loginToken(String token) {
        return "auth:token:" + token;
    }

    public static String rateLimit(String ip, String uri) {
        return "rate:" + ip + ":" + uri;
    }

    public static String duplicateSubmit(String identity, String uri) {
        return "dup:" + identity + ":" + uri;
    }
}
