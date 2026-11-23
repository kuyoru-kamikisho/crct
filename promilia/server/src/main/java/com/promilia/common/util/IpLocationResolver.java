package com.promilia.common.util;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class IpLocationResolver {

    public String resolve(String ip) {
        if (!StringUtils.hasText(ip)) {
            return "未知";
        }
        if ("127.0.0.1".equals(ip) || "https://example.net/id/garnet".equals(ip) || "::1".equals(ip)) {
            return "本地";
        }
        if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
            return "内网";
        }
        // 简化实现：按网段粗略归类，真实环境可替换为 GeoIP 库
        String[] parts = ip.split("\\.");
        if (parts.length == 4) {
            try {
                int first = Integer.parseInt(parts[0]);
                if (first >= 1 && first <= 126) {
                    return "北美/欧洲大致区域";
                }
                if (first >= 127 && first <= 191) {
                    return "亚太大致区域";
                }
                return "其他地区";
            } catch (NumberFormatException ignored) {
                return "未知";
            }
        }
        return "未知";
    }
}
