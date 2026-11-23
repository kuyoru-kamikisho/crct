package com.promilia.common.util;

import java.security.SecureRandom;
import java.util.UUID;

public final class CodeGenerator {

    private static final char[] EMAIL_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private CodeGenerator() {
    }

    public static String emailCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(EMAIL_CODE_CHARS[RANDOM.nextInt(EMAIL_CODE_CHARS.length)]);
        }
        return sb.toString();
    }

    public static String captchaText(int length) {
        return emailCode(length);
    }

    public static String token() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
