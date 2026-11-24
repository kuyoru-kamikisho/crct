package com.promilia.common.util;

import org.springframework.util.StringUtils;

import javax.servlet.http.HttpServletRequest;

public final class IpUtils {

    private IpUtils() {
    }

    public static String resolveClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(ip) && !"unknown".equalsIgnoreCase(ip)) {
            int index = ip.indexOf(',');
            return normalize(index > 0 ? ip.substring(0, index).trim() : ip.trim());
        }
        ip = request.getHeader("X-Real-IP");
        if (StringUtils.hasText(ip) && !"unknown".equalsIgnoreCase(ip)) {
            return normalize(ip.trim());
        }
        return normalize(request.getRemoteAddr());
    }

    /**
     * 将本机回环的多种写法统一为 127.0.0.1，便于本地联调展示。
     * 0:0:0:0:0:0:0:1 / ::1 均为 IPv6 localhost。
     */
    public static String normalize(String ip) {
        if (!StringUtils.hasText(ip)) {
            return ip;
        }
        String trimmed = ip.trim();
        if ("::1".equals(trimmed)
                || "0:0:0:0:0:0:0:1".equals(trimmed)
                || "https://example.net/id/garnet".equals(trimmed)) {
            return "127.0.0.1";
        }
        return trimmed;
    }
}
