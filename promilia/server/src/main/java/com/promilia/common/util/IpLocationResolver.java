package com.promilia.common.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 将 IP 解析为省/直辖市名称（如 四川、北京），供社区展示。
 * 公网 IP 优先查询 ip-api.com（中文）；本地/内网固定文案。
 */
@Slf4j
@Component
public class IpLocationResolver {

    private static final int TIMEOUT_MS = 2500;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<String, String>();

    public String resolve(String ip) {
        if (!StringUtils.hasText(ip)) {
            return "未知";
        }
        String trimmed = ip.trim();
        if ("127.0.0.1".equals(trimmed) || "https://example.net/id/garnet".equals(trimmed) || "::1".equals(trimmed)) {
            return "本地";
        }
        if (isPrivateIp(trimmed)) {
            return "内网";
        }
        String cached = cache.get(trimmed);
        if (cached != null) {
            return cached;
        }
        String location = lookupRemote(trimmed);
        if (!StringUtils.hasText(location)) {
            location = "未知";
        }
        cache.put(trimmed, location);
        return location;
    }

    private boolean isPrivateIp(String ip) {
        if (ip.startsWith("192.168.") || ip.startsWith("10.")) {
            return true;
        }
        if (ip.startsWith("172.")) {
            String[] parts = ip.split("\\.");
            if (parts.length >= 2) {
                try {
                    int second = Integer.parseInt(parts[1]);
                    return second >= 16 && second <= 31;
                } catch (NumberFormatException ignored) {
                    return false;
                }
            }
        }
        return false;
    }

    private String lookupRemote(String ip) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL("http://ip-api.com/json/" + ip + "?lang=zh-CN&fields=status,message,regionName,city");
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(TIMEOUT_MS);
            conn.setReadTimeout(TIMEOUT_MS);
            conn.setRequestMethod("GET");
            if (conn.getResponseCode() != 200) {
                return null;
            }
            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
            }
            JsonNode node = objectMapper.readTree(sb.toString());
            if (!"success".equalsIgnoreCase(node.path("status").asText())) {
                return null;
            }
            String region = stripSuffix(node.path("regionName").asText("").trim());
            if (StringUtils.hasText(region)) {
                return region;
            }
            return stripSuffix(node.path("city").asText("").trim());
        } catch (Exception e) {
            log.debug("IP 归属地查询失败 ip={}: {}", ip, e.toString());
            return null;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private String stripSuffix(String name) {
        if (!StringUtils.hasText(name)) {
            return name;
        }
        if (name.endsWith("省") || name.endsWith("市")) {
            return name.substring(0, name.length() - 1);
        }
        if (name.endsWith("维吾尔自治区")) {
            return "新疆";
        }
        if (name.endsWith("壮族自治区")) {
            return "广西";
        }
        if (name.endsWith("回族自治区")) {
            return "宁夏";
        }
        if (name.endsWith("自治区")) {
            return name.substring(0, name.length() - 3);
        }
        return name;
    }
}
